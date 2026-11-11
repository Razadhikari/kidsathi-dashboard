"use client";

import { useState } from "react";
import BusesTab from "@/components/transport/BusesTab";
import LiveTab from "@/components/transport/LiveTab";
import RidersTab from "@/components/transport/RidersTab";
import RoutesTab from "@/components/transport/RoutesTab";
import { muted } from "@/components/ui";

type Tab = "live" | "routes" | "riders" | "buses";

const TABS: { value: Tab; label: string }[] = [
  { value: "live", label: "🛰️ Live map" },
  { value: "routes", label: "🗺️ Routes & stops" },
  { value: "riders", label: "👧 Riders" },
  { value: "buses", label: "🚌 Buses" },
];

export default function TransportPage() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-extrabold">Transport</h1>
        <p className={muted}>School buses, routes and stops, which child rides where — and where the buses are right now.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`h-10 px-4 rounded-lg font-bold ${tab === t.value ? "bg-[#1F2A5C] text-white" : "bg-white border border-[#E7E1D6]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "live" && <LiveTab />}
      {tab === "routes" && <RoutesTab />}
      {tab === "riders" && <RidersTab />}
      {tab === "buses" && <BusesTab />}
    </div>
  );
}
