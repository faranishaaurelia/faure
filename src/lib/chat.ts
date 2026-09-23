// Helper & tipe untuk fitur chat (per produk & per pesanan).
//
// Skema tabel di Supabase:
//   conversations(id, context_type, context_id, user_id, created_at, last_message_at)
//   messages(id, conversation_id, sender_id, content, is_read, created_at)

export type ChatContextType = "product" | "order";

export type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type ConversationRow = {
  id: number;
  context_type: string;
  context_id: number;
  user_id: string;
  created_at: string;
  last_message_at: string | null;
};

export const MAKS_PESAN = 2000;

// Label waktu untuk gelembung chat: "Baru saja", "5 mnt", jam, "Kemarin", tanggal.
export function formatChatWaktu(
  iso: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale: string,
): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 60_000) return t("chat.justNow");

  if (diffMs < 3_600_000) {
    return t("chat.minAgo", { count: Math.floor(diffMs / 60_000) });
  }

  const jam = d.toLocaleTimeString(locale === "en" ? "en-US" : "id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (d.toDateString() === now.toDateString()) return jam;

  const kemarin = new Date(now);
  kemarin.setDate(now.getDate() - 1);
  if (d.toDateString() === kemarin.toDateString()) {
    return `${t("chat.yesterday")} ${jam}`;
  }

  const tanggal = d.toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
    day: "numeric",
    month: "short",
  });
  return `${tanggal} ${jam}`;
}

// Daftar kolom message yang selalu dipakai (biar konsisten di server page,
// server action, dan polling client).
export const KOLOM_MESSAGE =
  "id, conversation_id, sender_id, content, is_read, created_at";