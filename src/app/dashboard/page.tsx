"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Paged } from "@/lib/api";

type AttendanceRow = { id: string; child_name: string; check_in_at: string | null; check_out_at: string | null };

const time = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" })
    : "–";

export default function OverviewPage() {
  const [enrolled, setEnrolled] = useState<number | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<Paged<unknown>>("/api/v1/children/"), api<Paged<AttendanceRow>>("/api/v1/attendance/")])
      .then(([children, attendance]) => {
        setEnrolled(children.count);
        setRows(attendance.results);
      })
      .catch((err) =>
        setError(err instanceof ApiError && err.status === 403 ? "Your role can't see this page." : "Could not load data."),
      );
  }, []);

  const arrived = rows.filter((r) => r.check_in_at).length;
  const left = rows.filter((r) => r.check_out_at).length;
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu",
  });

  const cards = [
    { label: "Children enrolled", value: enrolled ?? "…" },
    { label: "Arrived today", value: arrived },
    { label: "Gone home", value: left },
    { label: "Not arrived yet", value: enrolled === null ? "…" : Math.max(enrolled - arrived, 0) },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold">Overview</h1>
        <p className="text-[#5B6170]">{today} (Nepal time)</p>
      </div>

      {error && <p className="text-[#B4233C]">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-[#E7E1D6] rounded-2xl p-5">
            <div className="text-sm font-semibold text-[#5B6170]">{c.label}</div>
            <div className="text-4xl font-extrabold mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <section className="bg-white border border-[#E7E1D6] rounded-2xl p-5">
        <h2 className="text-xl font-bold mb-3">Today&apos;s register</h2>
        {rows.length === 0 ? (
          <p className="text-[#5B6170]">No one has been checked in today yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-sm text-[#5B6170]">
                <tr>
                  <th className="py-2">Child</th>
                  <th className="py-2">Arrived</th>
                  <th className="py-2">Left</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#F0EBE1]">
                    <td className="py-2 font-semibold">{r.child_name}</td>
                    <td className="py-2">{time(r.check_in_at)}</td>
                    <td className="py-2">{time(r.check_out_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
