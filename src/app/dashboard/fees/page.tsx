"use client";

import { useEffect, useState } from "react";
import ChildFeesTab from "@/components/fees/ChildFeesTab";
import FeeItemsTab from "@/components/fees/FeeItemsTab";
import InvoicesTab from "@/components/fees/InvoicesTab";
import { errorStyle, muted } from "@/components/ui";
import { api } from "@/lib/api";
import { errorText } from "@/lib/errors";
import type { Today } from "@/lib/fees";

type Tab = "invoices" | "items" | "child-fees";

const TABS: { value: Tab; label: string }[] = [
  { value: "invoices", label: "Invoices" },
  { value: "items", label: "Fee items" },
  { value: "child-fees", label: "Child fees" },
];

export default function FeesPage() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [today, setToday] = useState<Today | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Today>("/api/v1/calendar/today/")
      .then(setToday)
      .catch((err) => setError(errorText(err)));
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-extrabold">Fees & invoices</h1>
        {today && (
          <p className={muted}>
            Today: {today.bs} BS · {today.bs_month_name} {today.bs_year} ({today.bs_month_name_ne})
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`h-10 px-4 rounded-lg font-bold ${tab === t.value ? "bg-[#1F2A5C] text-white" : "bg-white border border-[#E7E1D6]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className={errorStyle}>{error}</p>}

      {tab === "invoices" && today && <InvoicesTab today={today} />}
      {tab === "items" && <FeeItemsTab />}
      {tab === "child-fees" && <ChildFeesTab />}
    </div>
  );
}
