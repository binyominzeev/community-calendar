import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { buildCalendarItems, dateKey } from "@/lib/calendar-items";
import {
  GoogleAuthError,
  calendarExists,
  calendarFetch,
  createCalendar,
  getAccessToken,
} from "@/lib/google";

const PAST_DAYS = 30;
const FUTURE_MONTHS = 12;
const CONCURRENCY = 1;
const REQUEST_GAP_MS = 150;
const STALE_LOCK_MS = 10 * 60 * 1000;

interface DesiredEvent {
  summary: string;
  description?: string;
  date: string; // YYYY-MM-DD
}

function nextDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + 1, 12));
}

function hashContent(e: DesiredEvent): string {
  return createHash("sha1").update(JSON.stringify([e.summary, e.description ?? "", e.date])).digest("hex");
}

// Google event ids allow only 0-9 a-v (base32hex); deriving it from the key makes inserts idempotent.
function googleEventId(sourceKey: string): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuv";
  const bytes = createHash("sha1").update(sourceKey).digest();
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return `cc${out}`;
}

async function buildDesiredEvents(): Promise<Map<string, DesiredEvent>> {
  const noon = (offsetDays: number, offsetMonths = 0) => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth() + offsetMonths, t.getDate() + offsetDays, 12);
  };
  const start = noon(-PAST_DAYS);
  const end = noon(0, FUTURE_MONTHS);
  // Same items the Calendar page shows, unfiltered.
  const desired = new Map<string, DesiredEvent>();
  for (const item of await buildCalendarItems(start, end)) {
    desired.set(item.key, { summary: item.summary, description: item.description, date: item.date });
  }
  return desired;
}

function toGoogleBody(sourceKey: string, e: DesiredEvent, id?: string) {
  return {
    ...(id ? { id } : {}),
    summary: e.summary,
    description: e.description,
    start: { date: e.date },
    end: { date: nextDay(e.date) },
    transparency: "transparent",
    status: "confirmed",
    reminders: { useDefault: false },
    extendedProperties: { private: { ccKey: sourceKey } },
  };
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
      // Google's per-user write limit rejects bursts of calendar writes with 403.
      await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
    }
  });
  await Promise.all(runners);
}

interface SyncOptions {
  force?: boolean;
}

async function syncAccountOnce(accountId: number, options: SyncOptions): Promise<void> {
  const locked = await prisma.googleAccount.updateMany({
    where: {
      id: accountId,
      OR: [{ syncInProgress: false }, { syncStartedAt: { lt: new Date(Date.now() - STALE_LOCK_MS) } }],
    },
    data: { syncInProgress: true, syncStartedAt: new Date() },
  });
  if (locked.count === 0) return;

  let errorMessage: string | null = null;
  try {
    const accessToken = await getAccessToken(accountId);
    const account = await prisma.googleAccount.findUniqueOrThrow({ where: { id: accountId } });

    let calendarId = account.calendarId;
    if (!calendarId || !(await calendarExists(accessToken, calendarId))) {
      calendarId = await createCalendar(accessToken);
      await prisma.googleSyncItem.deleteMany({ where: { googleAccountId: accountId } });
      await prisma.googleAccount.update({ where: { id: accountId }, data: { calendarId } });
    }
    const eventsPath = `/calendars/${encodeURIComponent(calendarId)}/events`;

    const desired = await buildDesiredEvents();
    const existing = new Map(
      (await prisma.googleSyncItem.findMany({ where: { googleAccountId: accountId } })).map((i) => [
        i.sourceKey,
        i,
      ])
    );

    const upserts: [string, DesiredEvent][] = [];
    for (const [key, ev] of desired) {
      const item = existing.get(key);
      if (!item || options.force || item.contentHash !== hashContent(ev)) upserts.push([key, ev]);
    }
    const deletions = [...existing.values()].filter((i) => !desired.has(i.sourceKey));

    const total = upserts.length + deletions.length;
    let done = 0;
    await prisma.googleAccount.update({
      where: { id: accountId },
      data: { syncTotal: total, syncDone: 0, syncCurrent: null },
    });
    const reportProgress = async (label: string) => {
      done++;
      await prisma.googleAccount.update({
        where: { id: accountId },
        data: { syncDone: done, syncCurrent: label.slice(0, 120) },
      });
    };

    let failures = 0;
    let lastFailure = "";
    const fail = (e: unknown) => {
      if (e instanceof GoogleAuthError) throw e;
      failures++;
      lastFailure = e instanceof Error ? e.message : String(e);
    };

    await runPool(upserts, async ([key, ev]) => {
      try {
        const id = existing.get(key)?.googleEventId ?? googleEventId(key);
        const body = JSON.stringify(toGoogleBody(key, ev, id));
        let res = existing.has(key)
          ? await calendarFetch(accessToken, `${eventsPath}/${id}`, { method: "PUT", body })
          : await calendarFetch(accessToken, eventsPath, { method: "POST", body });
        // A missing event is recreated; a duplicate id (or a previously deleted one) is overwritten.
        if (res.status === 404) res = await calendarFetch(accessToken, eventsPath, { method: "POST", body });
        else if (res.status === 409) {
          res = await calendarFetch(accessToken, `${eventsPath}/${id}`, { method: "PUT", body });
        }
        if (!res.ok) throw new Error(`Google event upsert failed (${res.status}): ${(await res.text()).slice(0, 200)}`);

        await prisma.googleSyncItem.upsert({
          where: { googleAccountId_sourceKey: { googleAccountId: accountId, sourceKey: key } },
          update: { googleEventId: id, contentHash: hashContent(ev) },
          create: { googleAccountId: accountId, sourceKey: key, googleEventId: id, contentHash: hashContent(ev) },
        });
      } catch (e) {
        fail(e);
      }
      await reportProgress(`${ev.date} ${ev.summary}`);
    });

    await runPool(deletions, async (item) => {
      try {
        const res = await calendarFetch(accessToken, `${eventsPath}/${item.googleEventId}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 404 && res.status !== 410) {
          throw new Error(`Google event delete failed (${res.status})`);
        }
        await prisma.googleSyncItem.delete({ where: { id: item.id } });
      } catch (e) {
        fail(e);
      }
      await reportProgress(`Removing ${item.sourceKey}`);
    });

    if (failures > 0) errorMessage = `${failures} event(s) failed to sync: ${lastFailure}`;
  } catch (e) {
    errorMessage =
      e instanceof GoogleAuthError
        ? "Google access was revoked or expired; reconnect your account."
        : e instanceof Error
          ? e.message
          : String(e);
    console.error("[google-sync]", errorMessage);
  } finally {
    await prisma.googleAccount.update({
      where: { id: accountId },
      data: {
        syncInProgress: false,
        syncStartedAt: null,
        syncTotal: 0,
        syncDone: 0,
        syncCurrent: null,
        lastSyncError: errorMessage,
        ...(errorMessage === null ? { lastSyncAt: new Date() } : {}),
      },
    });
  }
}

const globalState = globalThis as unknown as {
  googleSyncRunning?: Set<number>;
  googleSyncRerun?: Map<number, SyncOptions>;
};
const running = (globalState.googleSyncRunning ??= new Set());
const rerun = (globalState.googleSyncRerun ??= new Map());

// Requests arriving mid-sync schedule one more pass so the latest data is never missed.
export async function syncAccount(accountId: number, options: SyncOptions = {}): Promise<void> {
  if (running.has(accountId)) {
    const queued = rerun.get(accountId);
    rerun.set(accountId, { force: Boolean(options.force || queued?.force) });
    return;
  }
  running.add(accountId);
  try {
    let next: SyncOptions | undefined = options;
    while (next) {
      await syncAccountOnce(accountId, next);
      next = rerun.get(accountId);
      rerun.delete(accountId);
    }
  } finally {
    running.delete(accountId);
  }
}

export async function syncAllAccounts(): Promise<void> {
  const accounts = await prisma.googleAccount.findMany({ select: { id: true } });
  for (const { id } of accounts) await syncAccount(id);
}

// Fire-and-forget hook for data-changing routes.
export function triggerSyncAll(): void {
  syncAllAccounts().catch((e) => console.error("[google-sync]", e));
}
