import type { Option } from "@/lib/types";

export type Today = {
  ad: string;
  bs: string;
  bs_year: number;
  bs_month: number;
  bs_month_name: string;
  bs_month_name_ne: string;
};

export type FeeItem = {
  id: string;
  name: string;
  name_ne: string;
  amount: string;
  frequency: string;
  is_active: boolean;
};

export type ChildFee = {
  id: string;
  child: string;
  child_name: string;
  fee_item: string;
  fee_name: string;
  amount_override: string | null;
  effective_amount: string;
  already_billed: boolean; // one-time fee already put on an invoice
};

export type Payment = { id: string; amount: string; method: string; paid_on: string; reference: string };

export type Invoice = {
  id: string;
  number: string;
  subject: string;
  child: string;
  child_name: string;
  bs_year: number;
  bs_month: number;
  period: string;
  period_ne: string;
  issue_date: string;
  due_date: string;
  status: "unpaid" | "partial" | "paid" | "cancelled";
  total: string;
  amount_paid: string;
  balance: string;
  lines: { description: string; amount: string }[];
  payments: Payment[];
};

export type Share = {
  pdf_url: string;
  message: string;
  recipients: { name: string; relation: string; phone: string; whatsapp_url: string }[];
};

export const BS_MONTHS = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

export const FREQUENCIES: Option[] = [
  { value: "monthly", label: "Monthly" },
  { value: "one_time", label: "One-time" },
];

/** Typical Nepali school fees, for one-click filling of the "Add fee item" form. */
export const COMMON_FEES: { name: string; name_ne: string; frequency: string }[] = [
  { name: "Monthly tuition fee", name_ne: "मासिक शिक्षण शुल्क", frequency: "monthly" },
  { name: "Transportation fee", name_ne: "यातायात शुल्क", frequency: "monthly" },
  { name: "Canteen / meal fee", name_ne: "खाजा शुल्क", frequency: "monthly" },
  { name: "Computer / lab fee", name_ne: "कम्प्युटर / ल्याब शुल्क", frequency: "monthly" },
  { name: "Administrative fee", name_ne: "प्रशासनिक शुल्क", frequency: "monthly" },
  { name: "Exam fee", name_ne: "परीक्षा शुल्क", frequency: "one_time" },
  { name: "Admission fee", name_ne: "भर्ना शुल्क", frequency: "one_time" },
  { name: "Annual / stationery fee", name_ne: "वार्षिक / स्टेसनरी शुल्क", frequency: "one_time" },
];

export const METHODS: Option[] = [
  { value: "cash", label: "Cash" },
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
  { value: "fonepay", label: "Fonepay QR" },
  { value: "connectips", label: "ConnectIPS" },
  { value: "bank", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
];

export const STATUS_STYLE: Record<Invoice["status"], { text: string; style: string }> = {
  unpaid: { text: "Unpaid", style: "bg-[#F9ECE7] text-[#8A3B12]" },
  partial: { text: "Partly paid", style: "bg-[#F9EEDA] text-[#6B4A0B]" },
  paid: { text: "Paid", style: "bg-[#E5F4E4] text-[#17432F]" },
  cancelled: { text: "Cancelled", style: "bg-[#F0EFEC] text-[#5B6170]" },
};

/** NPR with Nepali/Indian digit grouping: 100000 → "NPR 1,00,000". */
export const npr = (value: string | number) =>
  `NPR ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const methodLabel = (m: string) => METHODS.find((x) => x.value === m)?.label ?? m;
