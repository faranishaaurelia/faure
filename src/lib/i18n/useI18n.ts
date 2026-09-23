"use client";

// Hook client untuk membaca locale aktif dan menerjemahkan teks.
// Locale disimpan di cookie (LOCALE_COOKIE) oleh bagian server/middleware.
//
// Catatan: `translate` menerima objek kamus (dictionaries[locale]),
// bukan string locale-nya langsung, jadi kamusnya dipilih dulu di sini
// sebelum dioper ke `translate`.

import { useMemo } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { dictionaries } from "./dictionaries";
import { translate } from "./translate";

function bacaLocaleDariCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  const cocok = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  const nilai = cocok ? decodeURIComponent(cocok[1]) : null;

  return nilai && isLocale(nilai) ? nilai : DEFAULT_LOCALE;
}

export function useI18n() {
  // Cookie tidak berubah selama komponen hidup, jadi cukup dibaca sekali
  const locale = useMemo(bacaLocaleDariCookie, []);
  const messages = dictionaries[locale];

  const t = useMemo(
    () => (key: string, vars?: Record<string, string | number>) =>
      translate(messages, key, vars),
    [messages],
  );

  return { locale, t };
}
