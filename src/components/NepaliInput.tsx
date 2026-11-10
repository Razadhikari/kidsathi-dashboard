"use client";

import { useState } from "react";
import { input, smallInput } from "@/components/ui";
import { toNepali } from "@/lib/nepaliTyping";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fromEnglish?: string; // e.g. the English name, for the "From English" button
};

/** A Nepali text field with a helper box: type in English letters, get Devanagari. */
export default function NepaliInput({ value, onChange, placeholder, fromEnglish }: Props) {
  const [roman, setRoman] = useState("");

  function convert(text: string) {
    setRoman(text);
    onChange(toNepali(text));
  }

  return (
    <div className="flex flex-col gap-1">
      <input className={input} lang="ne" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
      <div className="flex gap-2">
        <input
          className={`${smallInput} flex-1 min-w-0`}
          placeholder="Type in English letters → नेपाली"
          aria-label="Type Nepali using English letters"
          value={roman}
          onChange={(e) => convert(e.target.value)}
        />
        {fromEnglish?.trim() && (
          <button type="button" onClick={() => convert(fromEnglish)}
            className="h-9 px-3 rounded-lg bg-[#F3ECDF] text-sm font-bold whitespace-nowrap hover:bg-[#EADFCB]">
            From English
          </button>
        )}
      </div>
    </div>
  );
}
