"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

// Dropdown yang bisa dicari dengan mengetik (combobox).
// Bisa dipakai dengan mouse, sentuhan, maupun keyboard:
// panah atas/bawah untuk memilih, Enter untuk memilih, Esc untuk menutup.

export default function SearchSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  disabledText,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  disabledText?: string;
  error?: string;
}) {
  const { t } = useI18n();
  const listId = `${id}-listbox`;
  const errorId = `${id}-error`;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const hasil = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  // Gulirkan daftar supaya pilihan yang disorot selalu terlihat
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${id}-opt-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);

  function buka() {
    if (disabled || open) return;
    setQuery("");
    // Sorot pilihan yang sedang dipakai (kalau ada)
    setActive(Math.max(options.indexOf(value), 0));
    setOpen(true);
  }

  function tutup() {
    setOpen(false);
    setQuery("");
  }

  function pilih(nilai: string) {
    onChange(nilai);
    tutup();
  }

  function tekanTombol(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) buka();
        else setActive((i) => Math.min(i + 1, hasil.length - 1));
        break;

      case "ArrowUp":
        e.preventDefault();
        if (open) setActive((i) => Math.max(i - 1, 0));
        break;

      case "Enter":
        // Jangan sampai Enter di sini ikut mengirim form
        e.preventDefault();
        if (!open) buka();
        else if (hasil[active]) pilih(hasil[active]);
        break;

      case "Escape":
        if (open) {
          e.preventDefault();
          tutup();
        }
        break;

      case "Tab":
        tutup();
        break;
    }
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onBlur={(e) => {
        // Tutup daftar kalau fokus pindah ke luar komponen ini
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) tutup();
      }}
    >
      <label htmlFor={id} className="block text-xs text-[#6B655A] mb-2">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && hasil[active] ? `${id}-opt-${active}` : undefined
          }
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          disabled={disabled}
          value={open ? query : value}
          placeholder={
            disabled
              ? disabledText
              : open
                ? t("account.searchSelect")
                : placeholder ?? t("common.select")
          }
          onFocus={buka}
          onClick={buka}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={tekanTombol}
          className={`
            h-11 w-full rounded-xl border bg-white pl-4 pr-10 text-sm text-[#1E1C18]
            placeholder:text-[#B5AEA2] transition
            focus:outline-none focus:border-[#1E1C18] focus:ring-1 focus:ring-[#1E1C18]
            disabled:bg-[#F5F4F1] disabled:text-[#B5AEA2] disabled:cursor-not-allowed
            ${error ? "border-[#B3261E]" : "border-[#E7E5E0]"}
          `}
        />

        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8478] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M5 8L10 13L15 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {open && (
        <div
          // Cegah input kehilangan fokus saat daftar diklik
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-[#E7E5E0] bg-white py-1 shadow-lg"
        >
          {hasil.length === 0 ? (
            <p role="status" className="px-4 py-3 text-xs text-[#8B8478]">
              {t("account.noResults", { query: query.trim() })}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label={label}>
              {hasil.map((opsi, i) => (
                <li
                  key={opsi}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={opsi === value}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pilih(opsi)}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm cursor-pointer ${
                    i === active ? "bg-[#F3F1EC]" : ""
                  } ${opsi === value ? "font-medium" : ""}`}
                >
                  {opsi}

                  {opsi === value && (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                      className="w-4 h-4 shrink-0"
                    >
                      <path
                        d="M4.5 10.5L8.5 14.5L15.5 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-[#B3261E]">
          {error}
        </p>
      )}
    </div>
  );
}
