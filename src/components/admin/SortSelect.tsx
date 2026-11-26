"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ChangeEvent } from "react";

export type SortOption = {
  value: string;
  label: string;
};

type SortSelectProps = {
  value: string;
  options: SortOption[];
  paramName?: string;
  baseParams?: Record<string, string | undefined>;
  ariaLabel?: string;
  className?: string;
};

/**
 * Dropdown urutan untuk halaman admin.
 * Nilai pertama pada `options` dianggap sebagai urutan default, sehingga
 * parameter tidak perlu ditulis di URL.
 */
export default function SortSelect({
  value,
  options,
  paramName = "sort",
  baseParams = {},
  ariaLabel = "Urutkan",
  className = "",
}: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const nilaiDefault = options[0]?.value ?? "";

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();

    for (const [key, val] of Object.entries(baseParams)) {
      if (val) params.set(key, val);
    }

    const dipilih = event.target.value;
    if (dipilih && dipilih !== nilaiDefault) {
      params.set(paramName, dipilih);
    } else {
      params.delete(paramName);
    }

    // Mulai lagi dari halaman pertama setiap kali urutan berubah.
    params.delete("page");

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-3.5 text-[#B7AEA3]"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
      </span>

      <select
        value={value}
        onChange={handleChange}
        disabled={pending}
        aria-label={ariaLabel}
        className="h-10 appearance-none rounded-full border border-[#E7E5E0] bg-white pl-9 pr-9 text-[13px] font-medium text-[#6B655A] transition hover:border-[#C8BEB3] focus:border-[#8B6B5A] focus:outline-none focus:ring-1 focus:ring-[#8B6B5A] disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <span
        aria-hidden
        className="pointer-events-none absolute right-3 text-[#B7AEA3]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}
