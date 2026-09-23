"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOutfit, checkoutOutfitBuyNow } from "@/lib/actions/outfit";
import { useI18n } from "@/lib/i18n";

type SumberItem = "toko" | "lemari";

// Kategori dipakai untuk menentukan POSISI AWAL & LAPISAN item saat
// pertama ditambahkan. Setelah itu posisi sepenuhnya bebas digeser
// (flat-lay, bukan manekin) — jadi ini bukan slot yang mengunci.
type SlotTubuh = "atasan" | "bawahan" | "outer" | "lainnya";

type ItemDipilih = {
  uid: string;
  slot: SlotTubuh;
  sumber: SumberItem;
  productId: number;
  variantId: number | null;
  closetItemId: number | null;
  nama: string;
  gambar: string | null;
  xPercent: number; // posisi kiri, dalam persen dari lebar kanvas
  yPercent: number; // posisi atas, dalam persen dari tinggi kanvas
  widthPercent: number;
  heightPercent: number;
  scale: number;
  zIndex: number;
};

type ProdukToko = {
  id: number;
  productId: number;
  variantId: number | null;
  nama: string;
  kategoriId: number | null;
  kategori: string;
  gambar: string | null;
};

type ItemLemari = {
  id: number;
  productId: number;
  variantId: number;
  nama: string;
  kategori: string;
  gambar: string | null;
};

type BuatOutfitProps = {
  produkToko: ProdukToko[];
  itemLemari: ItemLemari[];
  kategoriList: string[];
};

// Posisi & ukuran AWAL tiap kategori (persen dari kanvas).
// xPercent/yPercent = titik tengah slot saat pertama ditambahkan.
const SLOT_POSISI: Record<
  SlotTubuh,
  {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  }
> = {
  atasan: { xPercent: 42, yPercent: 30, widthPercent: 34, heightPercent: 26 },
  outer: { xPercent: 60, yPercent: 32, widthPercent: 36, heightPercent: 28 },
  bawahan: { xPercent: 48, yPercent: 62, widthPercent: 28, heightPercent: 34 },
  lainnya: { xPercent: 65, yPercent: 55, widthPercent: 22, heightPercent: 16 },
};

// Urutan lapisan default: bawahan di belakang, atasan di tengah,
// outer/aksesoris di depan. Saat item digeser, ia otomatis naik ke
// lapisan paling depan (lihat bawaKeDepan).
const LAPISAN_Z: Record<SlotTubuh, number> = {
  bawahan: 10,
  atasan: 20,
  lainnya: 30,
  outer: 30,
};

function kategoriKeSlot(kategori: string): SlotTubuh {
  const k = kategori.toLowerCase();
  if (k.includes("jaket") || k.includes("outer") || k.includes("cardigan")) {
    return "outer";
  }
  if (
    k.includes("celana") ||
    k.includes("rok") ||
    k.includes("kulot") ||
    k.includes("short")
  ) {
    return "bawahan";
  }
  if (
    k.includes("kaus") ||
    k.includes("kaos") ||
    k.includes("kemeja") ||
    k.includes("atasan") ||
    k.includes("blouse") ||
    k.includes("sweater") ||
    k.includes("hoodie")
  ) {
    return "atasan";
  }
  return "lainnya";
}

// Kotak cadangan saat item belum punya foto
function GambarAtauFallback({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className: string;
}) {
  if (src) {
    return <img src={src} alt={alt} className={className} draggable={false} />;
  }

  return (
    <div
      className={`${className} flex items-center justify-center text-[#C9C2B8]`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="h-8 w-8"
      >
        <path
          d="M24 14L13 19L18 31L24 27V50H40V27L46 31L51 19L40 14C38 18 26 18 24 14Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function BuatOutfit({
  produkToko,
  itemLemari,
  kategoriList,
}: BuatOutfitProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [sumber, setSumber] = useState<SumberItem>("toko");
  const [kategoriAktif, setKategoriAktif] = useState<string>("Semua");
  const [itemDiCanvas, setItemDiCanvas] = useState<ItemDipilih[]>([]);
  const [namaOutfit, setNamaOutfit] = useState("");

  // Status simpan & beli
  const [isSaving, startSaveTransition] = useTransition();
  const [isBuying, setIsBuying] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const zCounter = useRef(1);
  const uidCounter = useRef(1);

  // Berapa kali tiap kategori sudah ditambahkan — dipakai untuk
  // menggeser sedikit (fan-out) item baru di kategori yang sama,
  // supaya tidak menumpuk persis di titik yang sama.
  const jumlahPerSlot = useRef<Record<SlotTubuh, number>>({
    atasan: 0,
    bawahan: 0,
    outer: 0,
    lainnya: 0,
  });

  const tambahKeCanvas = (item: {
    productId: number;
    variantId: number | null;
    closetItemId: number | null;
    nama: string;
    gambar: string | null;
    kategori: string;
  }) => {
    const slot = kategoriKeSlot(item.kategori);
    const posisi = SLOT_POSISI[slot];
    const ke = jumlahPerSlot.current[slot]++;
    const geser = (ke % 4) * 4; // fan-out kecil tiap item baru di slot sama

    const uid = `${item.productId}-${uidCounter.current++}`;
    zCounter.current += 1;

    setItemDiCanvas((prev) => [
      ...prev,
      {
        uid,
        slot,
        sumber,
        productId: item.productId,
        variantId: item.variantId,
        closetItemId: item.closetItemId,
        nama: item.nama,
        gambar: item.gambar,
        widthPercent: posisi.widthPercent,
        heightPercent: posisi.heightPercent,
        xPercent: clampPercent(
          posisi.xPercent - posisi.widthPercent / 2 + geser,
          posisi.widthPercent,
        ),
        yPercent: clampPercent(
          posisi.yPercent - posisi.heightPercent / 2 + geser,
          posisi.heightPercent,
        ),
        scale: 1,
        zIndex: LAPISAN_Z[slot] + zCounter.current,
      },
    ]);
  };

  const hapusDariCanvas = (uid: string) => {
    setItemDiCanvas((prev) => prev.filter((i) => i.uid !== uid));
  };

  const ubahSkala = (uid: string, delta: number) => {
    setItemDiCanvas((prev) =>
      prev.map((i) =>
        i.uid === uid
          ? { ...i, scale: Math.max(0.5, Math.min(2, i.scale + delta)) }
          : i,
      ),
    );
  };

  const bawaKeDepan = (uid: string) => {
    zCounter.current += 1;
    const zBaru = zCounter.current + 35; // di atas lapisan default tapi tetap aman dalam canvas
    setItemDiCanvas((prev) =>
      prev.map((i) => (i.uid === uid ? { ...i, zIndex: zBaru } : i)),
    );
  };

  const kosongkanCanvas = () => setItemDiCanvas([]);

  // ===== SIMPAN OUTFIT =====
  const simpanOutfit = () => {
    if (itemDiCanvas.length === 0 || !namaOutfit.trim() || isSaving) return;
    setPesan(null);
    startSaveTransition(async () => {
      const result = await saveOutfit(
        namaOutfit,
        itemDiCanvas.map((item) => ({
          sumber: item.sumber,
          variantId: item.variantId,
          closetItemId: item.closetItemId,
          slot: item.slot,
          xPercent: item.xPercent,
          yPercent: item.yPercent,
          scale: item.scale,
          zIndex: item.zIndex,
        })),
      );

      if (result?.error) {
        setPesan(result.error);
        return;
      }

      if (result?.outfitId) {
        router.push(`/outfit-saya/${result.outfitId}`);
      }
    });
  };

  // ===== BELI SEMUA ITEM INI (checkout langsung dari kanvas) =====
  const beliSemua = async () => {
    if (itemDiCanvas.length === 0 || isBuying) return;
    setPesan(null);

    const variantIds = itemDiCanvas
      .map((i) => i.variantId)
      .filter((v): v is number => v !== null);

    if (variantIds.length === 0) {
      setPesan(t("outfit.noVariant"));
      return;
    }

    setIsBuying(true);
    const result = await checkoutOutfitBuyNow(variantIds);

    if (result?.error || !result?.items) {
      setPesan(result?.error ?? t("outfit.checkoutFail"));
      setIsBuying(false);
      return;
    }

    const itemsParam = result.items
      .map((i) => `${i.cartId}:${i.quantity}`)
      .join(",");

    router.push(`/checkout?items=${itemsParam}&mode=buynow`);
  };

  // ===== DRAG =====
  // Pakai Pointer Events + setPointerCapture: jalan untuk mouse dan
  // sentuhan HP, dan tetap menerima event susulan walau jari/kursor
  // sempat keluar dari elemen saat menggeser cepat.
  const draggingRef = useRef<{
    uid: string;
    mulaiClientX: number;
    mulaiClientY: number;
    mulaiXPercent: number;
    mulaiYPercent: number;
  } | null>(null);

  const mulaiDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    item: ItemDipilih,
  ) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = {
      uid: item.uid,
      mulaiClientX: e.clientX,
      mulaiClientY: e.clientY,
      mulaiXPercent: item.xPercent,
      mulaiYPercent: item.yPercent,
    };
    bawaKeDepan(item.uid);
  };

  const gerakDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;

    const deltaXPercent = ((e.clientX - drag.mulaiClientX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - drag.mulaiClientY) / rect.height) * 100;

    setItemDiCanvas((prev) =>
      prev.map((i) =>
        i.uid === drag.uid
          ? {
              ...i,
              xPercent: clampPercent(
                drag.mulaiXPercent + deltaXPercent,
                i.widthPercent,
              ),
              yPercent: clampPercent(
                drag.mulaiYPercent + deltaYPercent,
                i.heightPercent,
              ),
            }
          : i,
      ),
    );
  };

  const akhiriDrag = () => {
    draggingRef.current = null;
  };

  // Item tampil di sidebar kiri tergantung sumber & kategori aktif
  const produkTampil =
    sumber === "toko"
      ? kategoriAktif === "Semua"
        ? produkToko
        : produkToko.filter((p) => p.kategori === kategoriAktif)
      : itemLemari;

  return (
    <main className="bg-[#F8F8F8] text-[#1E1C18] min-h-screen pt-[110px] pb-16">
      <div className="site-container">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8B6B5A] font-semibold mb-2">
            Mix &amp; Match
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-[#2B2B2B]">
            {t("outfit.createTitle")}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr_280px] gap-6">
          {/* ============ SIDEBAR KIRI: PILIH ITEM ============ */}
          <aside className="bg-white rounded-2xl border border-black/5 p-4 h-fit">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSumber("toko")}
                className={`flex-1 text-xs font-medium py-2 rounded-full transition ${
                  sumber === "toko"
                    ? "bg-[#1E1C18] text-white"
                    : "bg-[#F0F0F0] text-[#4A4643]"
                }`}
              >
                {t("outfit.shop")}
              </button>
              <button
                onClick={() => setSumber("lemari")}
                className={`flex-1 text-xs font-medium py-2 rounded-full transition ${
                  sumber === "lemari"
                    ? "bg-[#1E1C18] text-white"
                    : "bg-[#F0F0F0] text-[#4A4643]"
                }`}
              >
                {t("outfit.closet")}
              </button>
            </div>

            <p className="text-[11px] text-[#8B8478] mb-3">
              {sumber === "toko"
                ? t("outfit.shopHint")
                : t("outfit.closetHint")}
            </p>

            {/* FILTER KATEGORI (hanya untuk tab Toko) */}
            {sumber === "toko" && kategoriList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["Semua", ...kategoriList].map((kategori) => (
                  <button
                    key={kategori}
                    onClick={() => setKategoriAktif(kategori)}
                    className={`px-3 py-1.5 rounded-full text-[10px] tracking-wide transition ${
                      kategoriAktif === kategori
                        ? "bg-[#1E1C18] text-white"
                        : "border border-[#E7E5E0] text-[#656058] hover:bg-[#F0F0F0]"
                    }`}
                  >
                    {kategori === "Semua" ? t("outfit.all") : kategori}
                  </button>
                ))}
              </div>
            )}

            {produkTampil.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {produkTampil.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      tambahKeCanvas({
                        productId: item.productId,
                        variantId: item.variantId,
                        closetItemId: sumber === "lemari" ? item.id : null,
                        nama: item.nama,
                        gambar: item.gambar,
                        kategori: item.kategori,
                      })
                    }
                    className="group text-left"
                  >
                    <div className="w-full aspect-square bg-[#EAE4DC] rounded-xl overflow-hidden mb-1.5 group-hover:ring-2 group-hover:ring-[#1E1C18] transition">
                      <GambarAtauFallback
                        src={item.gambar}
                        alt={item.nama}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] text-[#4A4643] line-clamp-2 leading-tight">
                      {item.nama}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#F8F8F8] rounded-xl">
                <p className="text-xs text-[#8B8478]">
                  {sumber === "toko"
                    ? kategoriAktif === "Semua"
                      ? t("outfit.noShopProducts")
                      : t("outfit.noCategoryProducts")
                    : t("outfit.emptyCloset")}
                </p>
              </div>
            )}
          </aside>

          {/* ============ KANVAS FLAT-LAY (tanpa manekin) ============ */}
          <div className="bg-white rounded-2xl border border-black/5 p-4 flex flex-col items-center">
            <div
              ref={canvasRef}
              className="relative isolate w-full max-w-[420px] aspect-[3/4] bg-[#F3F0EC] rounded-2xl overflow-hidden select-none"
            >
              {" "}
              {/* Placeholder kalau kosong */}
              {itemDiCanvas.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center px-6">
                  <p className="text-xs text-center text-[#8B8478]">
                    {t("outfit.canvasHint")}
                  </p>
                </div>
              )}
              {/* Item yang bisa digeser bebas */}
              {itemDiCanvas.map((item) => (
                <div
                  key={item.uid}
                  onPointerDown={(e) => mulaiDrag(e, item)}
                  onPointerMove={gerakDrag}
                  onPointerUp={akhiriDrag}
                  onPointerCancel={akhiriDrag}
                  style={{
                    left: `${item.xPercent}%`,
                    top: `${item.yPercent}%`,
                    width: `${item.widthPercent}%`,
                    height: `${item.heightPercent}%`,
                    zIndex: item.zIndex,
                    transform: `scale(${item.scale})`,
                    transformOrigin: "center center",
                    touchAction: "none",
                  }}
                  className="absolute group cursor-grab active:cursor-grabbing"
                >
                  <GambarAtauFallback
                    src={item.gambar}
                    alt={item.nama}
                    className="w-full h-full object-contain drop-shadow-md pointer-events-none"
                  />

                  {/* Kontrol kecil: selalu tampil di layar sentuh,
                      muncul saat hover di desktop */}
                  <div className="absolute -top-3 -right-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => ubahSkala(item.uid, 0.1)}
                      aria-label={t("outfit.enlarge")}
                      className="w-6 h-6 rounded-full bg-white shadow text-[11px] flex items-center justify-center hover:bg-[#F0F0F0]"
                    >
                      +
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => ubahSkala(item.uid, -0.1)}
                      aria-label={t("outfit.shrink")}
                      className="w-6 h-6 rounded-full bg-white shadow text-[11px] flex items-center justify-center hover:bg-[#F0F0F0]"
                    >
                      −
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => hapusDariCanvas(item.uid)}
                      aria-label={t("outfit.remove")}
                      className="w-6 h-6 rounded-full bg-white shadow text-[11px] flex items-center justify-center hover:bg-red-50 text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-[#8B8478] mt-3 text-center">
              {t("outfit.tips")}
            </p>

            {itemDiCanvas.length > 0 && (
              <button
                onClick={kosongkanCanvas}
                className="mt-2 text-[11px] text-[#8B8478] underline hover:text-[#1E1C18]"
              >
                {t("outfit.clearCanvas")}
              </button>
            )}
          </div>

          {/* ============ PANEL KANAN: SIMPAN / BELI ============ */}
          <aside className="bg-white rounded-2xl border border-black/5 p-5 h-fit space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#2b2b2b] mb-2">
                {t("outfit.outfitName")}
              </label>
              <input
                type="text"
                value={namaOutfit}
                onChange={(e) => setNamaOutfit(e.target.value)}
                placeholder={t("outfit.namePlaceholder")}
                className="w-full h-11 px-4 rounded-full border border-[#E7E5E0] text-sm focus:outline-none focus:border-[#1E1C18]"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-[#2b2b2b] mb-2">
                {t("outfit.selectedItems", { count: itemDiCanvas.length })}
              </p>
              {itemDiCanvas.length > 0 ? (
                <ul className="text-xs text-[#656058] space-y-1">
                  {itemDiCanvas.map((item) => (
                    <li key={item.uid}>• {item.nama}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#8B8478]">{t("outfit.noItems")}</p>
              )}
            </div>

            {pesan && (
              <p
                className={`text-xs ${
                  ["berhasil", "success"].some((kata) =>
                    pesan.toLowerCase().includes(kata),
                  )
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {pesan}
              </p>
            )}

            <div className="space-y-2 pt-2 border-t border-[#F0F0F0]">
              <button
                onClick={simpanOutfit}
                disabled={
                  itemDiCanvas.length === 0 || !namaOutfit.trim() || isSaving
                }
                className="w-full bg-[#1E1C18] text-white text-sm font-medium py-3 rounded-full hover:bg-black transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? t("outfit.saving") : t("outfit.saveOutfit")}
              </button>
              <button
                onClick={beliSemua}
                disabled={itemDiCanvas.length === 0 || isBuying}
                className="w-full border border-[#1E1C18] text-[#1E1C18] text-sm font-medium py-3 rounded-full hover:bg-[#1E1C18] hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isBuying ? t("outfit.preparing") : t("outfit.buyAll")}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// Jaga posisi item tetap dalam batas kanvas (boleh sedikit melewati
// tepi supaya foto besar tidak "terjebak" jauh dari pinggir).
function clampPercent(nilai: number, ukuranPercent: number) {
  const batasAtas = 100 - ukuranPercent * 0.3;
  const batasBawah = -ukuranPercent * 0.3;
  return Math.min(batasAtas, Math.max(batasBawah, nilai));
}
