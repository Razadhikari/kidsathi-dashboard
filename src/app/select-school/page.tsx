"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getSession, type Paged, saveSchool } from "@/lib/api";

type School = { id: string; name: string; district: string };

export default function SelectSchoolPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    api<Paged<School>>("/api/v1/schools/")
      .then((data) => {
        if (data.results.length === 1) {
          const only = data.results[0];
          saveSchool({ id: only.id, name: only.name });
          router.replace("/dashboard");
        } else {
          setSchools(data.results);
        }
      })
      .catch(() => setError("Could not load your schools."));
  }, [router]);

  function choose(school: School) {
    saveSchool({ id: school.id, name: school.name });
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Choose a school</h1>
        {error && <p className="text-[#B4233C]">{error}</p>}
        {schools === null && !error && <p className="text-[#5B6170]">Loading…</p>}
        {schools?.length === 0 && <p className="text-[#5B6170]">You are not a member of any school yet.</p>}
        {schools?.map((school) => (
          <button
            key={school.id}
            onClick={() => choose(school)}
            className="text-left bg-white border border-[#E7E1D6] rounded-2xl p-4 hover:border-[#1F2A5C]"
          >
            <div className="font-bold text-lg">{school.name}</div>
            <div className="text-sm text-[#5B6170]">{school.district}</div>
          </button>
        ))}
      </div>
    </main>
  );
}
