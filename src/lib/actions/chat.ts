"use server";

// Server actions untuk fitur chat (per produk & per pesanan).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import {
  KOLOM_MESSAGE,
  MAKS_PESAN,
  type ChatContextType,
  type ChatMessage,
} from "@/lib/chat";

export type ChatActionResult = {
  error: string | null;
  conversationId?: number | null;
  message?: ChatMessage | null;
};

const ID_VALID = (n: number) => Number.isInteger(n) && n > 0;

// Ambil thread user untuk sebuah konteks; kalau belum ada, buat baru.
// Konteks divalidasi dulu: produk harus aktif, pesanan harus milik user
// (RLS ikut menjaga, tapi validasi eksplisit membuat pesan error lebih jelas).
export async function ensureConversation(
  contextType: ChatContextType,
  contextId: number,
): Promise<ChatActionResult> {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("errors.loginRequired"), conversationId: null };
  if (!ID_VALID(contextId)) return { error: t("errors.generic") };

  // Validasi konteks.
  if (contextType === "product") {
    const { data: produk } = await supabase
      .from("products")
      .select("id")
      .eq("id", contextId)
      .eq("is_active", true)
      .maybeSingle();

    if (!produk) return { error: t("errors.productInvalid") };
  } else {
    const { data: pesanan } = await supabase
      .from("orders")
      .select("id")
      .eq("id", contextId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!pesanan) return { error: t("errors.orderNotFound") };
  }

  // Thread existing.
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("context_type", contextType)
    .eq("context_id", contextId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { error: null, conversationId: existing.id };

  // Buat thread baru.
  const { data: baru, error } = await supabase
    .from("conversations")
    .insert({
      context_type: contextType,
      context_id: contextId,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (!error && baru) return { error: null, conversationId: baru.id };

  // Kemungkinan kena unique constraint karena tab lain membuat duluan —
  // coba ambil lagi sebelum menyerah.
  const { data: ulang } = await supabase
    .from("conversations")
    .select("id")
    .eq("context_type", contextType)
    .eq("context_id", contextId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ulang) return { error: null, conversationId: ulang.id };

  return { error: t("errors.generic"), conversationId: null };
}

// Kirim pesan di sebuah thread. Pengecekan kepemilikan thread lewat sesi
// user: RLS hanya mengizinkan pemilik thread (user) atau admin untuk
// membacanya, jadi kalau thread tidak ketemu maka user tidak berhak.
export async function sendChatMessage(
  conversationId: number,
  content: string,
): Promise<ChatActionResult> {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("errors.loginRequired") };

  const isi = content.trim();
  if (!isi) return { error: t("chat.required") };
  if (isi.length > MAKS_PESAN) {
    return { error: t("chat.tooLong", { count: MAKS_PESAN }) };
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return { error: t("errors.generic") };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: isi,
    })
    .select(KOLOM_MESSAGE)
    .single();

  if (error || !data) {
    return { error: error?.message ?? t("chat.sendFail") };
  }

  // Update waktu pesan terakhir di conversation
  await supabase
    .from("conversations")
    .update({ last_message_at: data.created_at })
    .eq("id", conversationId);

  return { error: null, message: data };
}

// Tandai semua pesan orang lain di thread ini sudah dibaca.
export async function markChatRead(
  conversationId: number,
): Promise<ChatActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: null };

  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id);

  try {
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/chat");
    revalidatePath("/admin/dashboard");
    revalidatePath("/chat");
  } catch {}

  return { error: null };
}