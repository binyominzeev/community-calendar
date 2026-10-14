"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div style={{ maxWidth: "360px", margin: "80px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>Community Calendar</h1>
      <button
        className="btn btn-primary"
        onClick={() => signIn("pocket-id", { callbackUrl: "/" })}
      >
        Sign in with Pocket ID
      </button>
    </div>
  );
}
