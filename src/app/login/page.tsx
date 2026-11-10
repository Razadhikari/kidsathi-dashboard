"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { api, ApiError, saveSession, type Session } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await api<Session>("/api/v1/auth/login/", {
        method: "POST",
        json: { identifier, password },
      });
      saveSession(session);
      router.push("/select-school");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "Wrong phone number, email or password."
          : "Can't reach the server. Is the backend running?",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-[#1F2A5C] flex items-center justify-center text-[#E9A23B] text-2xl font-extrabold">
            K
          </div>
          <h1 className="text-3xl font-extrabold">KidSathi</h1>
          <p className="text-[#5B6170]">School dashboard</p>
        </div>

        <form onSubmit={onSubmit} className="bg-white border border-[#E7E1D6] rounded-2xl p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Mobile number or email
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="98XXXXXXXX"
              required
              className="h-12 px-3 rounded-xl border border-[#D9D2C4] bg-[#FBF7F0] text-base font-normal outline-none focus:border-[#1F2A5C]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 px-3 rounded-xl border border-[#D9D2C4] bg-[#FBF7F0] text-base font-normal outline-none focus:border-[#1F2A5C]"
            />
          </label>
          {error && <p className="text-sm text-[#B4233C]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl bg-[#1F2A5C] text-white font-bold disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>
    </main>
  );
}
