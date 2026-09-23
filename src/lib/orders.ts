// Helper untuk halaman pesanan: label status, format tanggal & harga, dll.

import { fotoProduk, type GambarProduk } from "@/lib/images";

export type StatusKey =
  | "menunggu_pembayaran"
  | "diproses"
  | "dikirim"
  | "selesai"
  | "dibatalkan";

export type PaymentKey =
  | "belum_dibayar"
  | "dibayar"
  | "gagal"
  | "kedaluwarsa"
  | "dikembalikan";

export type Tone = "kuning" | "biru" | "hijau" | "merah" | "abu";

// Tipe translator dari i18n (getT/useI18n). Opsional supaya helper ini tetap
// bisa dipakai tanpa konteks bahasa (mis. halaman admin yang selalu Indonesia).
export type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

// Pemetaan status -> key di dictionary (supaya label bisa diterjemahkan).
export const STATUS_TKEY: Record<StatusKey, string> = {
  menunggu_pembayaran: "account.statusPending",
  diproses: "account.statusProcessing",
  dikirim: "account.statusShipped",
  selesai: "account.statusDone",
  dibatalkan: "account.statusCancelled",
};

export const STATUS_DESC_TKEY: Record<StatusKey, string> = {
  menunggu_pembayaran: "account.statusPendingDesc",
  diproses: "account.statusProcessingDesc",
  dikirim: "account.statusShippedDesc",
  selesai: "account.statusDoneDesc",
  dibatalkan: "account.statusCancelledDesc",
};

export const PAYMENT_TKEY: Record<PaymentKey, string> = {
  belum_dibayar: "account.payUnpaid",
  dibayar: "account.payPaid",
  gagal: "account.payFailed",
  kedaluwarsa: "account.payExpired",
  dikembalikan: "account.payRefunded",
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const kapital = (s: string) => {
  const t = s.trim().replace(/_+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// =====================================================
// STATUS PESANAN
// Nama lain (pending, shipped, completed, dst.) dipetakan ke lima status ini.
// Status yang tidak dikenal tetap tampil apa adanya.
// =====================================================

const ALIAS_STATUS: Record<string, StatusKey> = {
  menunggu_pembayaran: "menunggu_pembayaran",
  menunggu: "menunggu_pembayaran",
  pending: "menunggu_pembayaran",
  unpaid: "menunggu_pembayaran",
  waiting_payment: "menunggu_pembayaran",
  awaiting_payment: "menunggu_pembayaran",
  belum_dibayar: "menunggu_pembayaran",

  diproses: "diproses",
  dikemas: "diproses",
  processing: "diproses",
  packing: "diproses",
  paid: "diproses",
  dibayar: "diproses",

  dikirim: "dikirim",
  shipped: "dikirim",
  shipping: "dikirim",
  in_transit: "dikirim",

  selesai: "selesai",
  diterima: "selesai",
  completed: "selesai",
  complete: "selesai",
  delivered: "selesai",
  received: "selesai",

  dibatalkan: "dibatalkan",
  batal: "dibatalkan",
  cancelled: "dibatalkan",
  canceled: "dibatalkan",
  expired: "dibatalkan",
  kedaluwarsa: "dibatalkan",
};

export const INFO_STATUS: Record<
  StatusKey,
  { label: string; tone: Tone; deskripsi: string }
> = {
  menunggu_pembayaran: {
    label: "Menunggu Pembayaran",
    tone: "kuning",
    deskripsi: "Selesaikan pembayaran supaya pesananmu bisa diproses.",
  },
  diproses: {
    label: "Diproses",
    tone: "biru",
    deskripsi: "Pembayaran diterima. Pesananmu sedang disiapkan.",
  },
  dikirim: {
    label: "Dikirim",
    tone: "biru",
    deskripsi: "Pesananmu sedang dalam perjalanan.",
  },
  selesai: {
    label: "Selesai",
    tone: "hijau",
    deskripsi: "Pesanan sudah diterima.",
  },
  dibatalkan: {
    label: "Dibatalkan",
    tone: "merah",
    deskripsi: "Pesanan ini dibatalkan.",
  },
};

// Nilai yang benar-benar tersimpan di kolom orders.status.
// Kolom itu dibatasi check constraint di database, dan nama untuk
// "menunggu_pembayaran" di DB adalah "pending". Kunci lain sama.
export const STATUS_DB: Record<StatusKey, string> = {
  menunggu_pembayaran: "pending",
  diproses: "diproses",
  dikirim: "dikirim",
  selesai: "selesai",
  dibatalkan: "dibatalkan",
};

// Ubah status apa pun (nama tampilan, alias, atau nilai DB) menjadi nilai
// yang aman disimpan ke kolom orders.status. Null kalau tidak dikenali.
export function statusDbValue(raw: string | null | undefined): string | null {
  const key = infoStatus(raw).key;
  return key ? STATUS_DB[key] : null;
}

// Urutan tahap untuk garis progres di halaman detail
export const TAHAP: StatusKey[] = [
  "menunggu_pembayaran",
  "diproses",
  "dikirim",
  "selesai",
];

export const TAB_STATUS: { key: "semua" | StatusKey; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "menunggu_pembayaran", label: "Menunggu Pembayaran" },
  { key: "diproses", label: "Diproses" },
  { key: "dikirim", label: "Dikirim" },
  { key: "selesai", label: "Selesai" },
  { key: "dibatalkan", label: "Dibatalkan" },
];

export function infoStatus(
  raw: string | null | undefined,
  t?: Translate,
): {
  key: StatusKey | null;
  label: string;
  tone: Tone;
  deskripsi: string;
} {
  const key = raw ? (ALIAS_STATUS[norm(raw)] ?? null) : null;

  if (key) {
    const info = INFO_STATUS[key];
    return {
      key,
      label: t ? t(STATUS_TKEY[key]) : info.label,
      tone: info.tone,
      deskripsi: t ? t(STATUS_DESC_TKEY[key]) : info.deskripsi,
    };
  }

  return {
    key: null,
    label: raw ? kapital(raw) : t ? t("account.unknown") : "Tidak diketahui",
    tone: "abu",
    deskripsi: "",
  };
}

// =====================================================
// STATUS PEMBAYARAN
// =====================================================

const ALIAS_BAYAR: Record<string, PaymentKey> = {
  belum_dibayar: "belum_dibayar",
  unpaid: "belum_dibayar",
  pending: "belum_dibayar",
  menunggu: "belum_dibayar",

  dibayar: "dibayar",
  paid: "dibayar",
  lunas: "dibayar",
  settlement: "dibayar",
  success: "dibayar",
  berhasil: "dibayar",

  gagal: "gagal",
  failed: "gagal",

  kedaluwarsa: "kedaluwarsa",
  expired: "kedaluwarsa",

  dikembalikan: "dikembalikan",
  refunded: "dikembalikan",
};

const INFO_BAYAR: Record<PaymentKey, { label: string; tone: Tone }> = {
  belum_dibayar: { label: "Belum dibayar", tone: "kuning" },
  dibayar: { label: "Sudah dibayar", tone: "hijau" },
  gagal: { label: "Pembayaran gagal", tone: "merah" },
  kedaluwarsa: { label: "Kedaluwarsa", tone: "merah" },
  dikembalikan: { label: "Dana dikembalikan", tone: "abu" },
};

export function infoPembayaran(
  raw: string | null | undefined,
  statusKey: StatusKey | null,
  t?: Translate,
): { key: PaymentKey | null; label: string; tone: Tone } {
  let key: PaymentKey | null = raw ? (ALIAS_BAYAR[norm(raw)] ?? null) : null;

  // Pesanan lama belum punya payment_status: tebak dari status pesanan
  if (!key && !raw && statusKey && statusKey !== "dibatalkan") {
    key = statusKey === "menunggu_pembayaran" ? "belum_dibayar" : "dibayar";
  }

  if (key) {
    const info = INFO_BAYAR[key];
    return { key, label: t ? t(PAYMENT_TKEY[key]) : info.label, tone: info.tone };
  }

  return { key: null, label: raw ? kapital(raw) : "-", tone: "abu" };
}

// =====================================================
// LABEL METODE
// =====================================================

const METODE_BAYAR: Record<string, string> = {
  qris: "QRIS",
  bca: "BCA Virtual Account",
  bni: "BNI Virtual Account",
  mandiri: "Mandiri Virtual Account",
  gopay: "GoPay",
};

const METODE_KIRIM: Record<string, string> = {
  hemat: "Hemat (5–7 hari kerja)",
  reguler: "Reguler (3–5 hari kerja)",
  ekspres: "Ekspres (1–2 hari kerja)",
};

// Key dictionary untuk tiap metode pengiriman (nama + estimasi waktu).
const METODE_KIRIM_TKEY: Record<string, { nama: string; eta: string }> = {
  hemat: { nama: "checkout.hemat", eta: "checkout.hematEta" },
  reguler: { nama: "checkout.reguler", eta: "checkout.regulerEta" },
  ekspres: { nama: "checkout.ekspres", eta: "checkout.ekspresEta" },
};

export const labelMetodeBayar = (v: string | null | undefined) =>
  v ? (METODE_BAYAR[norm(v)] ?? kapital(v)) : "-";

export const labelPengiriman = (v: string | null | undefined, t?: Translate) => {
  if (!v) return "-";
  const kunci = norm(v);
  const key = METODE_KIRIM_TKEY[kunci];
  if (t && key) return `${t(key.nama)} (${t(key.eta)})`;
  return METODE_KIRIM[kunci] ?? kapital(v);
};

// =====================================================
// STATUS PENGAJUAN REFUND
// =====================================================

export type RefundStatusKey = "menunggu" | "disetujui" | "ditolak";

const ALIAS_REFUND: Record<string, RefundStatusKey> = {
  menunggu: "menunggu",
  pending: "menunggu",
  review: "menunggu",
  belum_diproses: "menunggu",

  disetujui: "disetujui",
  approved: "disetujui",
  disetujui_dikembalikan: "disetujui",

  ditolak: "ditolak",
  rejected: "ditolak",
};

const INFO_REFUND: Record<RefundStatusKey, { label: string; tone: Tone }> = {
  menunggu: { label: "Menunggu review", tone: "kuning" },
  disetujui: { label: "Disetujui", tone: "hijau" },
  ditolak: { label: "Ditolak", tone: "merah" },
};

// Nilai yang benar-benar tersimpan di kolom refund_requests.status.
export const REFUND_STATUS_DB: Record<RefundStatusKey, string> = {
  menunggu: "pending",
  disetujui: "approved",
  ditolak: "rejected",
};

export function infoRefund(
  raw: string | null | undefined,
): { key: RefundStatusKey | null; label: string; tone: Tone } {
  const key = raw ? (ALIAS_REFUND[norm(raw)] ?? null) : null;

  if (key) {
    const info = INFO_REFUND[key];
    return { key, label: info.label, tone: info.tone };
  }

  return { key: null, label: raw ? kapital(raw) : "-", tone: "abu" };
}

// =====================================================
// FORMAT
// =====================================================

export const angka = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const rupiah = (n: number) =>
  "Rp" + Math.round(n).toLocaleString("id-ID");

export const kodePesanan = (id: number) =>
  `FAURE-${String(id).padStart(6, "0")}`;

export const formatTanggal = (iso: string, loc: string = "id-ID") =>
  new Date(iso).toLocaleDateString(loc, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

export const formatTanggalWaktu = (iso: string, loc: string = "id-ID") =>
  new Date(iso).toLocaleString(loc, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }) + (loc === "id-ID" ? " WIB" : " (WIB)");

// =====================================================
// DATA ITEM PESANAN
// =====================================================

// Supabase mengembalikan relasi many-to-one sebagai objek, tapi tipenya
// kadang terbaca array. Fungsi ini menangani keduanya.
export function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export type VarianRow = {
  size: string | null;
  color: string | null;
  image_url: string | null;
  products?:
    | { id?: number; name: string; product_images?: GambarProduk | GambarProduk[] | null }
    | { id?: number; name: string; product_images?: GambarProduk | GambarProduk[] | null }[]
    | null;
};

export type ItemRow = {
  id: number;
  product_name_snapshot: string | null;
  price: number | string;
  quantity: number;
  product_variants: VarianRow | VarianRow[] | null;
};

export function infoItem(item: ItemRow, t?: Translate) {
  const varian = satu(item.product_variants);
  const produk = satu(varian?.products);

  const detail = [
    varian?.size
      ? t
        ? t("product.sizeWith", { size: varian.size })
        : `Ukuran ${varian.size}`
      : null,
    varian?.color,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: item.id,
    nama:
      item.product_name_snapshot ||
      produk?.name ||
      (t ? t("common.product") : "Produk"),
    detail,
    gambar: fotoProduk(varian, produk),
    harga: angka(item.price),
    jumlah: item.quantity,
  };
}
