"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { clearSession, getSchool, getSession } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Overview", ready: true },
  { href: "/dashboard/children", label: "Children", ready: true },
  { href: "/dashboard/classrooms", label: "Classrooms", ready: true },
  { href: "/dashboard/attendance", label: "Attendance", ready: false },
  { href: "/dashboard/fees", label: "Fees & invoices", ready: false },
  { href: "/dashboard/notices", label: "Notices", ready: false },
  { href: "/dashboard/photos", label: "Photos", ready: false },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [names, setNames] = useState<{ user: string; school: string } | null>(null);

  useEffect(() => {
    const session = getSession();
    const school = getSchool();
    if (!session) return router.replace("/login");
    if (!school) return router.replace("/select-school");
    setNames({ user: session.user.full_name || session.user.phone_number, school: school.name });
  }, [router]);

  if (!names) return null;

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex flex-wrap">
      <aside className="w-full md:w-60 bg-[#1F2A5C] text-white p-5 flex flex-col gap-6 md:min-h-screen">
        <div>
          <div className="text-2xl font-extrabold">KidSathi</div>
          <div className="text-sm text-[#C9CFEA]">{names.school}</div>
        </div>
        <nav className="flex md:flex-col gap-1 flex-wrap">
          {NAV.map((item) =>
            item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg font-semibold ${
                  (item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)) ? "bg-[#E9A23B] text-[#1F2A5C]" : "hover:bg-[#2E3B78]"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <span key={item.href} className="px-3 py-2 rounded-lg text-[#8F97C4]" title="Coming soon">
                {item.label}
              </span>
            ),
          )}
        </nav>
        <div className="md:mt-auto flex flex-col gap-2 text-sm">
          <span className="text-[#C9CFEA]">{names.user}</span>
          <button onClick={() => router.push("/select-school")} className="text-left hover:underline">
            Switch school
          </button>
          <button onClick={logout} className="text-left hover:underline">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 md:p-10">{children}</main>
    </div>
  );
}
