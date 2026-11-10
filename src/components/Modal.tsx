"use client";

import type { ReactNode } from "react";

/** A simple pop-up window. Click outside it or press × to close. */
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-2xl w-full max-w-5xl p-6 mt-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-lg hover:bg-[#F3ECDF] text-2xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
