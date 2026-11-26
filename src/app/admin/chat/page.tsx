import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import MarkChatRead from "@/components/chat/MarkChatRead";
import AdminReplyBox from "@/components/chat/AdminReplyBox";
import SortSelect from "@/components/admin/SortSelect";

export const dynamic = "force-dynamic";

const SORT_CHAT = [
  { value: "terbaru", label: "Terbaru" },
  { value: "terlama", label: "Terlama" },
  { value: "belum-dibaca", label: "Belum dibaca" },
  { value: "nama-az", label: "Nama A–Z" },
];

type SortChat = (typeof SORT_CHAT)[number]["value"];

type Tab = "semua" | "produk" | "pesanan";

// Nilai context_type di database: 'product' dan 'order'
const TAB_KE_TIPE: Record<Exclude<Tab, "semua">, string> = {
  produk: "product",
  pesanan: "order",
};

function waktu(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function potong(teks: string, maks = 60) {
  return teks.length > maks ? `${teks.slice(0, maks)}…` : teks;
}

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; room?: string; sort?: string }>;
}) {
  const {
    tab: tabParam,
    room: roomParam,
    sort: sortParam,
  } = await searchParams;
  const tab: Tab =
    tabParam === "produk" || tabParam === "pesanan" ? tabParam : "semua";
  const roomId = roomParam ? Number(roomParam) : null;

  const supabase = await createClient();

  // ---------- 1. Semua room obrolan (terbaru di atas) ----------
  const { data: konversiData } = await supabase
    .from("conversations")
    .select("id, context_type, context_id, user_id, last_message_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const semuaRoom = konversiData ?? [];
  const idRoom = semuaRoom.map((c) => c.id);

  // ---------- 2. Pesan, nama pembeli, nama produk ----------
  const idProduk = semuaRoom
    .filter((c) => c.context_type === "product")
    .map((c) => c.context_id);
  const idUser = [...new Set(semuaRoom.map((c) => c.user_id))];

  const [pesanRes, profilRes, produkRes] = await Promise.all([
    idRoom.length
      ? supabase
          .from("messages")
          .select(
            "id, conversation_id, sender_id, content, is_read, created_at",
          )
          .in("conversation_id", idRoom)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    idUser.length
      ? supabase.from("profiles").select("id, full_name").in("id", idUser)
      : Promise.resolve({ data: [] }),
    idProduk.length
      ? supabase.from("products").select("id, name").in("id", idProduk)
      : Promise.resolve({ data: [] }),
  ]);

  const semuaPesan = pesanRes.data ?? [];
  const namaUser = new Map(
    (profilRes.data ?? []).map((p) => [p.id, p.full_name as string | null]),
  );
  const namaProduk = new Map(
    (produkRes.data ?? []).map((p) => [p.id, p.name as string]),
  );

  // ---------- 3. Ringkasan tiap room ----------
  const ringkasan = semuaRoom.map((c) => {
    const pesanRoom = semuaPesan.filter((m) => m.conversation_id === c.id);
    // Belum dibaca = pesan dari pembeli yang belum ditandai dibaca
    const belumDibaca = pesanRoom.filter(
      (m) => m.sender_id === c.user_id && !m.is_read,
    ).length;

    const label =
      c.context_type === "product"
        ? `Produk: ${namaProduk.get(c.context_id) ?? `#${c.context_id}`}`
        : `Pesanan #${c.context_id}`;

    return {
      ...c,
      label,
      pembeli: namaUser.get(c.user_id) || "Pengguna",
      pesanTerakhir: pesanRoom[0] ?? null, // urutan terbaru dulu
      belumDibaca,
    };
  });

  // ---------- 4. Hitungan untuk tab ----------
  const hitung = (tipe?: string) => {
    const daftar = tipe
      ? ringkasan.filter((r) => r.context_type === tipe)
      : ringkasan;
    return {
      total: daftar.length,
      belumDibaca: daftar.filter((r) => r.belumDibaca > 0).length,
    };
  };

  const tabs: { key: Tab; label: string; jumlah: ReturnType<typeof hitung> }[] =
    [
      { key: "semua", label: "Semua", jumlah: hitung() },
      { key: "produk", label: "Produk", jumlah: hitung("product") },
      { key: "pesanan", label: "Pesanan", jumlah: hitung("order") },
    ];

  const daftarTampil =
    tab === "semua"
      ? ringkasan
      : ringkasan.filter((r) => r.context_type === TAB_KE_TIPE[tab]);

  // ---------- Urutan ----------
  const sort: SortChat = SORT_CHAT.some((s) => s.value === sortParam)
    ? (sortParam as SortChat)
    : "terbaru";

  const waktuPesan = (iso: string | null | undefined) =>
    iso ? new Date(iso).getTime() : 0;

  const daftarTerurut = [...daftarTampil].sort((a, b) => {
    switch (sort) {
      case "terlama": {
        const aWaktu = waktuPesan(a.last_message_at) || Number.MAX_SAFE_INTEGER;
        const bWaktu = waktuPesan(b.last_message_at) || Number.MAX_SAFE_INTEGER;
        return aWaktu - bWaktu;
      }
      case "belum-dibaca": {
        const selisih = b.belumDibaca - a.belumDibaca;
        if (selisih !== 0) return selisih;
        return waktuPesan(b.last_message_at) - waktuPesan(a.last_message_at);
      }
      case "nama-az":
        return a.pembeli.localeCompare(b.pembeli, "id");
      default:
        return waktuPesan(b.last_message_at) - waktuPesan(a.last_message_at);
    }
  });

  // ---------- 5. Room yang sedang dibuka ----------
  const roomAktif = roomId
    ? (ringkasan.find((r) => r.id === roomId) ?? null)
    : null;
  const isiObrolan = roomAktif
    ? semuaPesan
        .filter((m) => m.conversation_id === roomAktif.id)
        .sort(
          (a, b) =>
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime(),
        )
    : [];

  function href(t: Tab, room?: number) {
    const params = new URLSearchParams();
    if (t !== "semua") params.set("tab", t);
    if (room) params.set("room", String(room));
    if (sort !== "terbaru") params.set("sort", sort);
    const qs = params.toString();
    return `/admin/chat${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <AdminPageHeader
        title="Chat"
        description="Pesan dari pelanggan tentang produk dan pesanan mereka."
      />

      {/* ===== Tab & urutan ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex flex-wrap gap-2 sm:flex-1">
          {tabs.map((t) => {
            const aktif = t.key === tab;
            return (
              <Link
                key={t.key}
                href={href(t.key)}
                aria-current={aktif ? "page" : undefined}
                className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border text-[13px] font-medium transition ${
                  aktif
                    ? "border-[#1E1C18] bg-[#1E1C18] text-white"
                    : "border-[#E7E5E0] bg-white text-[#6B655A] hover:border-[#1E1C18]"
                }`}
              >
                {t.label}
                <span className={aktif ? "text-white/70" : "text-[#9A7B69]"}>
                  {t.jumlah.total}
                </span>
                {t.jumlah.belumDibaca > 0 && (
                  <span className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-[#B3261E] px-1.5 text-[10px] font-semibold text-white">
                    {t.jumlah.belumDibaca}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <SortSelect
          value={sort}
          options={SORT_CHAT}
          baseParams={{
            tab: tab !== "semua" ? tab : undefined,
            room: roomId ? String(roomId) : undefined,
          }}
          ariaLabel="Urutkan chat"
        />
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4 items-start">
        {/* ===== Daftar room ===== */}
        <div className="bg-white rounded-[22px] border border-black/5 shadow-sm overflow-y-auto max-h-[640px]">
          {daftarTerurut.length === 0 ? (
            <p className="px-5 py-12 text-center text-[13px] text-[#8A837B]">
              Belum ada obrolan di sini.
            </p>
          ) : (
            <ul className="divide-y divide-[#F0ECE6]">
              {daftarTerurut.map((r) => {
                const dipilih = r.id === roomAktif?.id;
                return (
                  <li key={r.id}>
                    <Link
                      href={href(tab, r.id)}
                      className={`block px-5 py-4 transition ${
                        dipilih ? "bg-[#F7F3EE]" : "hover:bg-[#FAF7F3]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[13px] font-semibold truncate">
                          {r.pembeli}
                        </p>
                        <span className="shrink-0 text-[11px] text-[#8A837B]">
                          {waktu(r.last_message_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-[#8B6B5A] truncate">
                        {r.label}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="text-[12px] text-[#716A63] truncate">
                          {r.pesanTerakhir
                            ? potong(r.pesanTerakhir.content)
                            : "Belum ada pesan"}
                        </p>
                        {r.belumDibaca > 0 && (
                          <span className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-[#B3261E] px-1.5 text-[10px] font-semibold text-white">
                            {r.belumDibaca}
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

        {/* ===== Isi obrolan ===== */}
        <div className="bg-white rounded-[22px] border border-black/5 shadow-sm min-h-[420px] flex flex-col">
          {!roomAktif ? (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
              <p className="text-[13px] text-[#8A837B]">
                Pilih obrolan di sebelah kiri untuk membacanya.
              </p>
            </div>
          ) : (
            <>
              <MarkChatRead
                conversationId={roomAktif.id}
                unreadCount={roomAktif.belumDibaca}
              />
              <div className="px-5 py-4 border-b border-[#F0ECE6]">
                <p className="text-[14px] font-semibold">{roomAktif.pembeli}</p>
                <Link
                  href={
                    roomAktif.context_type === "product"
                      ? `/admin/products/${roomAktif.context_id}`
                      : `/admin/orders/${roomAktif.context_id}`
                  }
                  className="text-[12px] text-[#8B6B5A] hover:text-[#1E1C18] underline underline-offset-4 transition"
                >
                  {roomAktif.label}
                </Link>
              </div>

              <div className="flex-1 px-5 py-5 space-y-3 overflow-y-auto max-h-[520px]">
                {isiObrolan.length === 0 ? (
                  <p className="text-center text-[13px] text-[#8A837B]">
                    Belum ada pesan.
                  </p>
                ) : (
                  isiObrolan.map((m) => {
                    const dariPembeli = m.sender_id === roomAktif.user_id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${dariPembeli ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] whitespace-pre-wrap break-words ${
                            dariPembeli
                              ? "bg-[#F3F1EC] text-[#1E1C18]"
                              : "bg-[#1E1C18] text-white"
                          }`}
                        >
                          {m.content}
                          <p
                            className={`mt-1 text-[10px] ${
                              dariPembeli ? "text-[#8A837B]" : "text-white/60"
                            }`}
                          >
                            {waktu(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-4 border-t border-[#F0ECE6]">
                <AdminReplyBox
                  key={roomAktif.id}
                  conversationId={roomAktif.id}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
