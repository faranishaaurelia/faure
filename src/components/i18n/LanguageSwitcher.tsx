"use client";

import { useI18n } from "@/components/i18n/LocaleProvider";

export default function LanguageSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();
  const next = locale === "id" ? "en" : "id";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#DDD8D0] bg-[#FAF8F5] p-1 transition-all ${
        compact ? "h-8 text-[10px]" : "h-9 text-[11px]"
      }`}
      role="group"
      aria-label={t("nav.language")}
    >
      {/* Globe Icon */}
      <span className="pl-1.5 text-[#7A7369] shrink-0" aria-hidden="true">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      </span>

      {/* ID Button */}
      <button
        type="button"
        onClick={() => setLocale("id")}
        aria-pressed={locale === "id"}
        aria-label="Bahasa Indonesia"
        className={`px-2 py-0.5 rounded-full font-semibold transition-all duration-200 cursor-pointer ${
          locale === "id"
            ? "bg-[#1E1C18] text-white shadow-xs"
            : "text-[#888177] hover:text-[#1E1C18]"
        }`}
      >
        ID
      </button>

      {/* EN Button */}
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        aria-label="English"
        className={`px-2 py-0.5 rounded-full font-semibold transition-all duration-200 cursor-pointer ${
          locale === "en"
            ? "bg-[#1E1C18] text-white shadow-xs"
            : "text-[#888177] hover:text-[#1E1C18]"
        }`}
      >
        EN
      </button>
    </div>
  );
}
