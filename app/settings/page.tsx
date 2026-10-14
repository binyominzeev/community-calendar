"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Tag {
  id: number;
  name: string;
  _count?: { personTags: number };
}

interface EventType {
  id: number;
  name: string;
}

interface YahrzeitRelationOption {
  id: number;
  name: string;
}

function TagsSection() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTags = async () => {
    const res = await fetch("/api/tags");
    setTags(await res.json());
  };

  useEffect(() => { fetchTags(); }, []);

  const createTag = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      fetchTags();
    } finally {
      setSaving(false);
    }
  };

  const saveTag = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchTags();
  };

  const deleteTag = async (id: number, name: string) => {
    if (!confirm(`Delete tag "${name}"?`)) return;
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    fetchTags();
  };

  return (
    <section style={{ marginBottom: "40px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Tags</h2>
      <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "12px" }}>
        Tags are used to group people and filter calendar views.
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          className="input"
          style={{ width: "200px" }}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createTag()}
          placeholder="New tag name…"
        />
        <button className="btn btn-primary" onClick={createTag} disabled={saving}>
          Add Tag
        </button>
      </div>

      <table className="data-table" style={{ maxWidth: "500px" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>People</th>
            <th style={{ width: "140px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((tag) => (
            <tr key={tag.id}>
              <td>
                {editingId === tag.id ? (
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveTag(tag.id)}
                    autoFocus
                  />
                ) : (
                  <span className="badge badge-blue">{tag.name}</span>
                )}
              </td>
              <td style={{ color: "#6b7280", fontSize: "12px" }}>
                {tag._count?.personTags ?? 0}
              </td>
              <td>
                {editingId === tag.id ? (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="btn btn-primary" onClick={() => saveTag(tag.id)}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteTag(tag.id, tag.name)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {tags.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", color: "#9ca3af", padding: "24px" }}>
                No tags yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function EventTypesSection() {
  const [types, setTypes] = useState<EventType[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTypes = async () => {
    const res = await fetch("/api/event-types");
    setTypes(await res.json());
  };

  useEffect(() => { fetchTypes(); }, []);

  const createType = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      fetchTypes();
    } finally {
      setSaving(false);
    }
  };

  const saveType = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/event-types/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchTypes();
  };

  const deleteType = async (id: number, name: string) => {
    if (!confirm(`Delete event type "${name}"? This will affect all events of this type.`)) return;
    await fetch(`/api/event-types/${id}`, { method: "DELETE" });
    fetchTypes();
  };

  return (
    <section>
      <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Event Types</h2>
      <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "12px" }}>
        Add additional event types as needed. Built-in types: Yahrzeit, Birthday.
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          className="input"
          style={{ width: "200px" }}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createType()}
          placeholder="New type name…"
        />
        <button className="btn btn-primary" onClick={createType} disabled={saving}>
          Add Type
        </button>
      </div>

      <table className="data-table" style={{ maxWidth: "400px" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th style={{ width: "180px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type.id}>
              <td>
                {editingId === type.id ? (
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveType(type.id)}
                    autoFocus
                  />
                ) : (
                  type.name
                )}
              </td>
              <td>
                {editingId === type.id ? (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="btn btn-primary" onClick={() => saveType(type.id)}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setEditingId(type.id); setEditName(type.name); }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteType(type.id, type.name)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {types.length === 0 && (
            <tr>
              <td colSpan={2} style={{ textAlign: "center", color: "#9ca3af", padding: "24px" }}>
                No event types yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function YahrzeitRelationsSection() {
  const [options, setOptions] = useState<YahrzeitRelationOption[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOptions = async () => {
    const res = await fetch("/api/yahrzeit-relations");
    setOptions(await res.json());
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch("/api/yahrzeit-relations");
      const data = await res.json();
      if (mounted) setOptions(data);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const createOption = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/yahrzeit-relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      fetchOptions();
    } finally {
      setSaving(false);
    }
  };

  const saveOption = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/yahrzeit-relations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchOptions();
  };

  const deleteOption = async (id: number, name: string) => {
    if (!confirm(`Delete yahrzeit relation "${name}"?`)) return;
    await fetch(`/api/yahrzeit-relations/${id}`, { method: "DELETE" });
    fetchOptions();
  };

  return (
    <section style={{ marginBottom: "40px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Yahrzeit Relations</h2>
      <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "12px" }}>
        Relationship labels for Yahrzeit events (for example: Apa, Anya, Nagymama, Sajat).
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          className="input"
          style={{ width: "240px" }}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createOption()}
          placeholder="New relation name..."
        />
        <button className="btn btn-primary" onClick={createOption} disabled={saving}>
          Add Relation
        </button>
      </div>

      <table className="data-table" style={{ maxWidth: "500px" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th style={{ width: "180px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {options.map((option) => (
            <tr key={option.id}>
              <td>
                {editingId === option.id ? (
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveOption(option.id)}
                    autoFocus
                  />
                ) : (
                  option.name
                )}
              </td>
              <td>
                {editingId === option.id ? (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="btn btn-primary" onClick={() => saveOption(option.id)}>Save</button>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setEditingId(option.id); setEditName(option.name); }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteOption(option.id, option.name)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {options.length === 0 && (
            <tr>
              <td colSpan={2} style={{ textAlign: "center", color: "#9ca3af", padding: "24px" }}>
                No yahrzeit relation options yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

const GOOGLE_MESSAGES: Record<string, string> = {
  connected: "Google account connected; the first sync is running.",
  denied: "Google access was not granted.",
  invalid_state: "The Google sign-in could not be verified. Please try again.",
  no_refresh_token: "Google did not return offline access. Remove the app's access in your Google account and retry.",
  error: "Connecting to Google failed.",
};

interface GoogleStatus {
  connected: boolean;
  googleEmail?: string | null;
  syncInProgress?: boolean;
  syncTotal?: number;
  syncDone?: number;
  syncCurrent?: string | null;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
}

function GoogleSection() {
  const params = useSearchParams();
  const notice = GOOGLE_MESSAGES[params.get("google") ?? ""];
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/google/status")
      .then((r) => r.json())
      .then((data: GoogleStatus) => {
        if (!cancelled) setStatus(data);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const syncing = status?.syncInProgress;
  useEffect(() => {
    if (!syncing) return;
    const timer = setInterval(() => setRefreshKey((k) => k + 1), 1500);
    return () => clearInterval(timer);
  }, [syncing]);

  const syncNow = async (force: boolean) => {
    if (force && !confirm("Re-send every event to Google? This can take several minutes.")) return;
    await fetch("/api/google/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    setTimeout(() => setRefreshKey((k) => k + 1), 500);
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Google? The calendar already created in Google is kept.")) return;
    await fetch("/api/google/disconnect", { method: "POST" });
    setRefreshKey((k) => k + 1);
  };

  return (
    <section style={{ marginBottom: "40px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Google Calendar</h2>
      <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "12px" }}>
        Syncs Hebrew dates, holidays, yahrzeits and birthdays to a separate calendar in your Google account.
        Manual edits in that calendar are overwritten on the next sync.
      </p>
      {notice && <p style={{ fontSize: "13px", marginBottom: "12px" }}>{notice}</p>}
      {status?.connected ? (
        <div>
          <p style={{ fontSize: "13px", marginBottom: "8px" }}>
            Connected{status.googleEmail ? ` as ${status.googleEmail}` : ""}.{" "}
            {status.syncInProgress
              ? "Syncing..."
              : status.lastSyncAt
                ? `Last sync: ${new Date(status.lastSyncAt).toLocaleString()}`
                : "Not synced yet."}
          </p>
          {status.syncInProgress && (
            <div style={{ marginBottom: "12px" }}>
              <progress
                value={status.syncDone ?? 0}
                max={Math.max(status.syncTotal ?? 0, 1)}
                style={{ width: "100%", maxWidth: "400px" }}
              />
              <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>
                {status.syncTotal
                  ? `${status.syncDone ?? 0} / ${status.syncTotal}`
                  : "Preparing..."}
                {status.syncCurrent ? ` — ${status.syncCurrent}` : ""}
              </p>
            </div>
          )}
          {status.lastSyncError && (
            <p style={{ color: "#b91c1c", fontSize: "13px", marginBottom: "8px" }}>{status.lastSyncError}</p>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-primary" onClick={() => syncNow(false)} disabled={syncing}>Sync now</button>
            <button className="btn btn-secondary" onClick={() => syncNow(true)} disabled={syncing} title="Re-sends everything; use if events were changed or deleted in Google">Full resync</button>
            <a className="btn btn-secondary" href="/api/google/connect">Reconnect</a>
            <button className="btn btn-danger" onClick={disconnect}>Disconnect</button>
          </div>
        </div>
      ) : (
        status && <a className="btn btn-primary" href="/api/google/connect">Connect Google account</a>
      )}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "24px" }}>Settings</h1>
      <Suspense fallback={null}>
        <GoogleSection />
      </Suspense>
      <TagsSection />
      <YahrzeitRelationsSection />
      <EventTypesSection />
    </div>
  );
}
