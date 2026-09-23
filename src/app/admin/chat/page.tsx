import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { kodePesanan } from "@/lib/orders";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { translate } from "@/lib/i18n/translate";
import { formatChatWaktu } from "@/lib/chat";

export const dynamic = "force-dynamic";

type ConversationAdmin = {
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

type PesanAdmin = {
  conversation_id: number;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

const t = (key: string, vars?: Record<string, string | number>) =>
  translate(dictionaries.id, key, vars);

const PER_HALAMAN = 10;

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      "id, context_type, context_id, user_id, created_at, last_message_at, profiles ( full_name )",
    )
    .order("last_message_at", { ascending: false });

  const daftar = (conversations ?? []) as unknown as ConversationAdmin[];

  // ---------- Pesan per conversation (untuk preview & unread) ----------
  const convIds = daftar.map((c) => c.id);
  const { data: semuaPesan } =
    convIds.length > 0
      ? await supabase
          .from("messages")
          .select(
            "conversation_id, sender_id, content, is_read, created_at",
          )
          .in("conversation_id", convIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const pesanMap = new Map<number, PesanAdmin[]>();
  for (const m of (semuaPesan ?? []) as PesanAdmin[]) {
    const arr = pesanMap.get(m.conversation_id) ?? [];
    arr.push(m);
    pesanMap.set(m.conversation_id, arr);
  }

  // Filter percakapan yang hanya memiliki pesan
  const daftarValid = daftar.filter((c) => (pesanMap.get(c.id)?.length ?? 0) > 0);

  // ---------- Nama produk utk konteks product ----------
  const productIds = [
    ...new Set(
      daftarValid
        .filter((c) => c.context_type === "product")
        .map((c) => c.context_id),
    ),
  ];
  const { data: products } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select("id, name")
          .in("id", productIds)
      : { data: [] };

  const namaProduk = new Map(
    (products ?? []).map((p) => [p.id, p.name as string]),
  );

  // ---------- Label konteks ----------
  const labelKonteks = (c: ConversationAdmin) =>
    c.context_type === "product"
      ? (namaProduk.get(c.context_id) ?? `Produk #${c.context_id}`)
      : kodePesanan(c.context_id);

  const jenisLabel = (c: ConversationAdmin) =>
    c.context_type === "product" ? "Produk" : "Pesanan";

  const totalUnread = [...pesanMap.values()].reduce(
    (sum, arr) =>
      sum +
      arr.filter((m) => user && m.sender_id !== user.id && !m.is_read).length,
    0,
  );

  // ---------- Pagination ----------
  const halamanSekarang = Math.max(1, parseInt(pageParam ?? "1", 10));
  const totalHalaman = Math.ceil(daftarValid.length / PER_HALAMAN);
  const halamanValid = Math.min(halamanSekarang, Math.max(1, totalHalaman));
  const mulai = (halamanValid - 1) * PER_HALAMAN;
  const daftarTampil = daftarValid.slice(mulai, mulai + PER_HALAMAN);

  function hrefHalaman(h: number) {
    return h > 1 ? `/admin/chat?page=${h}` : "/admin/chat";
  }


  return (
    <div>
      <AdminPageHeader
        title="Chat"
        description="Balas pertanyaan pelanggan — chat produk maupun chat pesanan."
        action={
          totalUnread > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B3261E] px-3.5 py-1.5 text-[12px] font-semibold text-white">
              {totalUnread} belum dibaca
            </span>
          ) : undefined
        }
      />

      <div className="admin-card overflow-hidden">
        {daftarValid.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F3EE] text-[#B7AEA3]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </span>
            <p className="mt-3 text-sm font-medium text-[#1E1C18]">
              Belum ada percakapan.
            </p>
            <p className="mt-1 text-sm text-[#8A837B]">
              Chat dari pelanggan (produk & pesanan) akan muncul di sini.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#EFEDE8]">
            {daftarTampil.map((c) => {
              const pesan = pesanMap.get(c.id) ?? [];
              const terakhir = pesan[pesan.length - 1] ?? null;
              const unread = user
                ? pesan.filter(
                    (m) => m.sender_id !== user.id && !m.is_read,
                  ).length
                : 0;
              const profil = satu(c.profiles);
              const nama = profil?.full_name ?? "Pelanggan";
              const inisial = nama.trim().charAt(0).toUpperCase() || "?";

              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/chat/${c.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#FAF7F3]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0E9E2] font-semibold text-[#8B6B5A]">
                      {inisial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#1E1C18]">
                          {nama}
                        </p>
                        <span className="shrink-0 rounded-full bg-[#F3EFE9] px-2 py-0.5 text-[10px] font-medium text-[#8B6B5A]">
                          {jenisLabel(c)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-[#8A837B]">
                        {labelKonteks(c)}
                      </p>
                      <p className="mt-1 truncate text-[12px] text-[#5C554D]">
                        {terakhir ? terakhir.content : "Belum ada pesan"}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-[11px] text-[#A39B92]">
                        {terakhir
                          ? formatChatWaktu(terakhir.created_at, t, "id-ID")
                          : formatChatWaktu(c.created_at, t, "id-ID")}
                      </span>
                      {unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B3261E] px-1.5 text-[10px] font-bold text-white">
                          {unread}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ===== Pagination ===== */}
      {totalHalaman > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4 text-[13px]">
          <p className="text-[#8A837B]">
            Menampilkan {mulai + 1}–{Math.min(mulai + PER_HALAMAN, daftarValid.length)} dari {daftarValid.length} percakapan
          </p>
          <div className="flex items-center gap-1">
            <Link
              href={hrefHalaman(halamanValid - 1)}
              aria-disabled={halamanValid <= 1}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${halamanValid <= 1 ? "pointer-events-none border-[#E7E5E0] text-[#C0B8AE]" : "border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"}`}
            >
              ←
            </Link>
            {Array.from({ length: totalHalaman }, (_, i) => i + 1).map((h) => (
              <Link
                key={h}
                href={hrefHalaman(h)}
                aria-current={h === halamanValid ? "page" : undefined}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-medium transition ${h === halamanValid ? "border-[#1E1C18] bg-[#1E1C18] text-white" : "border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"}`}
              >
                {h}
              </Link>
            ))}
            <Link
              href={hrefHalaman(halamanValid + 1)}
              aria-disabled={halamanValid >= totalHalaman}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${halamanValid >= totalHalaman ? "pointer-events-none border-[#E7E5E0] text-[#C0B8AE]" : "border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"}`}
            >
              →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}