export const LOCALE_COOKIE = "faure_locale";
export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "id" || value === "en";
}

export function dateLocale(locale: Locale) {
  return locale === "en" ? "en-GB" : "id-ID";
}
