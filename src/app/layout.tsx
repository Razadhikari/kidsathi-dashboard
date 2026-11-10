import type { Metadata } from "next";
import { Mukta } from "next/font/google";
import "./globals.css";

const mukta = Mukta({ subsets: ["latin", "devanagari"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "KidSathi – School dashboard",
  description: "Run your Montessori school with KidSathi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${mukta.className} antialiased`}>{children}</body>
    </html>
  );
}
