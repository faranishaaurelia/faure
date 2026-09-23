import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminChatThread from "@/components/chat/AdminChatThread";
import { kodePesanan } from "@/lib/orders";
import { KOLOM_MESSAGE, type ChatMessage } from "@/lib/chat";

export const dynamic = "force-dynamic";

type Konversasi = {
  id: number;
  context_type: string;
  context_id: number;
  user_id: string;
  created_at: string;
  last_message_at: string | null;
  profiles:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function AdminChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const convId = Number(id);

  if (!Number.isInteger(convId) || convId <= 0) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, context_type, context_id, user_id, created_at, last_message_at, profiles ( full_name )",
    )
    .eq("id", convId)
    .single();

  if (!conv) notFound();

  const konversasi = conv as unknown as Konversasi;
  const profil = satu(konversasi.profiles);
  const namaPelanggan = profil?.full_name || "Pelanggan";

  // Label konteks: nama produk / kode pesanan + link ke detailnya.
  let contextLabel = `#${konversasi.context_id}`;
  let contextHref: string | null = null;

  if (konversasi.context_type === "product") {
    const { data: produk } = await supabase
      .from("products")
      .select("id, name")
      .eq("id", konversasi.context_id)
      .maybeSingle();
    contextLabel = produk?.name ?? `Produk #${konversasi.context_id}`;
    if (produk) contextHref = `/produk/${produk.id}`;
  } else {
    contextLabel = kodePesanan(konversasi.context_id);
    contextHref = `/admin/orders/${konversasi.context_id}`;
  }

  // Tandai semua pesan pelanggan di thread ini sudah dibaca oleh admin
  if (user) {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", convId)
      .neq("sender_id", user.id);
  }

  const { data: msgs } = await supabase
    .from("messages")
    .select(KOLOM_MESSAGE)
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  return (
    <div>
      <AdminPageHeader
        kicker="Chat"
        title={namaPelanggan}
        description={
          konversasi.context_type === "product"
            ? "Chat produk — tanya seputar produk sebelum/sesudah beli."
            : "Chat pesanan — tanya status atau detail pesanan."
        }
      />

      <Link
        href="/admin/chat"
        className="inline-flex items-center gap-1.5 mb-5 text-[12px] font-medium text-[#8B6B5A] hover:text-[#1E1C18] transition"
      >
        <span aria-hidden>←</span> Kembali ke daftar chat
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#F3EFE9] px-3 py-1 text-[11px] font-medium text-[#8B6B5A]">
          {konversasi.context_type === "product" ? "Produk" : "Pesanan"}
        </span>
        {contextHref ? (
          <Link
            href={contextHref}
            className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E0] bg-white px-3 py-1 text-[11px] font-medium text-[#6B655A] transition hover:border-[#1E1C18] hover:text-[#1E1C18]"
          >
            {contextLabel} →
          </Link>
        ) : (
          <span className="rounded-full border border-[#E7E5E0] bg-white px-3 py-1 text-[11px] font-medium text-[#6B655A]">
            {contextLabel}
          </span>
        )}
      </div>

      <AdminChatThread
        conversationId={convId}
        initialMessages={(msgs as ChatMessage[] | null) ?? []}
        participantName={namaPelanggan}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}