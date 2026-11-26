"use client";

import { useState } from "react";
import { unduhNotaPdf } from "@/lib/nota-pdf";
import type { NotaData, NotaLabels } from "@/lib/nota";

type Props = {
  data: NotaData;
  labels: NotaLabels;
};

export default function NotaActions({ data, labels }: Props) {
  const [sedangUnduh, setSedangUnduh] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function unduh() {
    if (sedangUnduh) return;

    setSedangUnduh(true);
    setGalat(null);
    try {
      await unduhNotaPdf(data, labels);
    } catch (error) {
      console.error("Gagal membuat PDF nota:", error);
      setGalat(labels.downloadError);
    } finally {
      setSedangUnduh(false);
    }
  }

  return (
    <div className="nota-no-print">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#DDD8D2] bg-white px-6 text-xs font-medium text-[#4A463F] transition hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2M7 15h10v6H7v-6Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {labels.print}
        </button>

        <button
          type="button"
          onClick={unduh}
          disabled={sedangUnduh}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-6 text-xs font-medium text-white transition hover:bg-[#302D2A] disabled:cursor-wait disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {sedangUnduh ? labels.downloading : labels.download}
        </button>

        <p className="text-[11px] text-[#8B8478]">{labels.printHint}</p>
      </div>

      {galat && (
        <p role="alert" className="mt-3 text-[12px] text-[#B3261E]">
          {galat}
        </p>
      )}
    </div>
  );
}
