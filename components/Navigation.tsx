"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/people", label: "People" },
  { href: "/calendar", label: "Calendar" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Settings" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname.startsWith("/login")) return null;
  return (
    <nav
      style={{
        borderBottom: "1px solid var(--border)",
        background: "#fff",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: "0",
        height: "48px",
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: "16px",
          marginRight: "32px",
          color: "#1d4ed8",
        }}
      >
        📅 Community Calendar
      </span>
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: "0 16px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              fontSize: "14px",
              fontWeight: active ? 600 : 400,
              color: active ? "#1d4ed8" : "#374151",
              borderBottom: active ? "2px solid #1d4ed8" : "2px solid transparent",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
          >
            {item.label}
          </Link>
        );
      })}
      {session?.user && (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
          <span style={{ color: "#6b7280" }}>{session.user.name ?? session.user.email}</span>
          <button className="btn btn-secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
