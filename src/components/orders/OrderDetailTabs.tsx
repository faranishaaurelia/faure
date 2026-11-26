"use client";

// Tab ringkas untuk panel detail pesanan. Konten tiap tab dikirim dari Server
// Component sebagai ReactNode, jadi hanya logika tab yang berjalan di browser.

import { useState, type KeyboardEvent, type ReactNode } from "react";

export type OrderDetailTab = {
  key: string;
  label: string;
  content: ReactNode;
};

type Props = {
  tabs: OrderDetailTab[];
  defaultTab?: string;
  ariaLabel: string;
  idPrefix?: string;
};

export default function OrderDetailTabs({
  tabs,
  defaultTab,
  ariaLabel,
  idPrefix = "order-detail",
}: Props) {
  const awal = defaultTab && tabs.some((tab) => tab.key === defaultTab)
    ? defaultTab
    : tabs[0]?.key;
  const [aktif, setAktif] = useState(awal ?? "");

  const indeksAktif = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === aktif),
  );
  const tabAktif = tabs[indeksAktif];

  if (!tabAktif) return null;

  const idTab = (key: string) => `${idPrefix}-tab-${key}`;
  const idPanel = (key: string) => `${idPrefix}-panel-${key}`;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let berikut: number | null = null;

    if (event.key === "ArrowRight") berikut = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") berikut = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") berikut = 0;
    if (event.key === "End") berikut = tabs.length - 1;

    if (berikut === null) return;

    event.preventDefault();
    setAktif(tabs[berikut].key);

    const tombol = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
    tombol?.[berikut]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1 overflow-x-auto rounded-full bg-[#F3F1EC] p-1 inner-scroll"
      >
        {tabs.map((tab, index) => {
          const dipilih = index === indeksAktif;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={idTab(tab.key)}
              aria-selected={dipilih}
              aria-controls={idPanel(tab.key)}
              tabIndex={dipilih ? 0 : -1}
              onClick={() => setAktif(tab.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex-1 shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-medium transition ${
                dipilih
                  ? "bg-white text-[#1E1C18] shadow-sm"
                  : "text-[#8B8478] hover:text-[#1E1C18]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={idPanel(tabAktif.key)}
        aria-labelledby={idTab(tabAktif.key)}
        tabIndex={0}
        className="pt-5 outline-none focus-visible:ring-2 focus-visible:ring-[#1E1C18]/20"
      >
        {tabAktif.content}
      </div>
    </div>
  );
}
