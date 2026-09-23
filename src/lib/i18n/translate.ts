export function translate(
  messages: unknown,
  key: string,
  vars?: Record<string, string | number>,
) {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (
      current &&
      typeof current === "object" &&
      part in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  if (typeof current !== "string") return key;

  if (!vars) return current;

  return current.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] == null ? `{${name}}` : String(vars[name]),
  );
}

export function translateCategory(
  t: (key: string) => string,
  slugOrName: string | null | undefined,
): string {
  if (!slugOrName) return "";
  const slug = slugOrName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const translated = t(`categories.${slug}`);
  return translated !== `categories.${slug}` ? translated : slugOrName;
}
