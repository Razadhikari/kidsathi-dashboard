"use client";

import { useEffect, useState } from "react";
import MessagesTab from "@/components/notices/MessagesTab";
import NoticesTab from "@/components/notices/NoticesTab";
import { errorStyle, muted } from "@/components/ui";
import { api, type Paged } from "@/lib/api";
import { errorText } from "@/lib/errors";
import type { Child, Classroom } from "@/lib/types";

type Tab = "notices" | "messages";

export default function NoticesPage() {
  const [tab, setTab] = useState<Tab>("notices");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [kids, setKids] = useState<Child[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Paged<Classroom>>("/api/v1/classrooms/?page_size=500"),
      api<Paged<Child>>("/api/v1/children/?page_size=500"),
    ])
      .then(([rooms, children]) => {
        setClassrooms(rooms.results);
        setKids(children.results);
      })
      .catch((err) => setError(errorText(err)));
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-extrabold">Notices & messages</h1>
        <p className={muted}>Notices go to all parents of the school or of one class. Messages are private conversations with a child’s parents.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "notices", label: "📢 Notices" },
            { value: "messages", label: "💬 Messages" },
          ] as { value: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`h-10 px-4 rounded-lg font-bold ${tab === t.value ? "bg-[#1F2A5C] text-white" : "bg-white border border-[#E7E1D6]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className={errorStyle}>{error}</p>}
      {tab === "notices" && <NoticesTab classrooms={classrooms} kids={kids} />}
      {tab === "messages" && <MessagesTab kids={kids} />}
    </div>
  );
}
