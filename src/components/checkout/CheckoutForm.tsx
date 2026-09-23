"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Address } from "@/lib/addresses";
import { createOrder } from "@/lib/actions/orders";
import { useI18n } from "@/components/i18n/LocaleProvider";

// =====================================================
// ITEM CHECKOUT (dari keranjang user, diambil di server)
// =====================================================

export type CheckoutItem = {
  id: number;
  nama: string;
  ukuran: string;
  warna: string;
  harga: number;
  jumlah: number;
  gambar: string | null;
};

// Voucher contoh (kode -> persen diskon)
const voucherContoh: Record<string, number> = { FAURE10: 10 };

// =====================================================
// HELPER
// =====================================================

const rupiah = (angka: number) => "Rp" + angka.toLocaleString("id-ID");

const alamatLengkap = (a: Address) =>
  Boolean(
    a.recipient_name &&
    a.phone &&
    a.full_address &&
    a.city &&
    a.province &&
    a.postal_code,
  );

const inputClass = (error?: string) => `
  w-full rounded-lg border bg-white px-4 text-[13px] text-[#1A1A1A]
  placeholder:text-[#B0A9A1] transition
  focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]
  ${error ? "border-[#B3261E]" : "border-[#DDD8D2]"}
`;

// =====================================================
// KOMPONEN KECIL
// =====================================================

function SectionTitle({ no, judul }: { no: number; judul: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[10px]">
        {no}
      </span>
      <h2 className="text-sm font-medium">{judul}</h2>
    </div>
  );
}

function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  trailing,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description: string;
  trailing?: string;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only peer"
      />

      <div
        className={`
          flex items-center gap-4 rounded-lg border px-4 py-3.5 transition
          peer-focus-visible:ring-2 peer-focus-visible:ring-[#1A1A1A] peer-focus-visible:ring-offset-2
          ${
            checked
              ? "border-[#1A1A1A] bg-[#FAF8F5]"
              : "border-[#DDD8D2] hover:border-[#1A1A1A]"
          }
        `}
      >
        <span
          className={`
            w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition
            ${checked ? "border-[#1A1A1A] bg-[#1A1A1A]" : "border-[#CFC9C2]"}
          `}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full bg-white ${
              checked ? "opacity-100" : "opacity-0"
            }`}
          />
        </span>

        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-medium">{title}</span>
          <span className="block mt-0.5 text-[11px] text-[#8A8178]">
            {description}
          </span>
        </span>

        {trailing && (
          <span className="text-[13px] text-[#1A1A1A]">{trailing}</span>
        )}
      </div>
    </label>
  );
}

// =====================================================
// CHECKOUT
// =====================================================

export default function CheckoutForm({
  addresses,
  items,
  kembaliKe = "/cart",
  mode = "cart",
}: {
  addresses: Address[];
  items: CheckoutItem[];
  kembaliKe?: string;
  mode?: "cart" | "buynow";
}) {
  const { t } = useI18n();

  const opsiPengiriman = [
    {
      id: "hemat",
      nama: t("checkout.hemat"),
      estimasi: t("checkout.hematEta"),
      biaya: 9000,
    },
    {
      id: "reguler",
      nama: t("checkout.reguler"),
      estimasi: t("checkout.regulerEta"),
      biaya: 15000,
    },
    {
      id: "ekspres",
      nama: t("checkout.ekspres"),
      estimasi: t("checkout.ekspresEta"),
      biaya: 30000,
    },
  ];

  const opsiPembayaran = [
    {
      id: "qris",
      nama: t("checkout.qris"),
      deskripsi: t("checkout.qrisDesc"),
    },
    {
      id: "bca",
      nama: t("checkout.bca"),
      deskripsi: t("checkout.bcaDesc"),
    },
    {
      id: "bni",
      nama: t("checkout.bni"),
      deskripsi: t("checkout.bniDesc"),
    },
    {
      id: "mandiri",
      nama: t("checkout.mandiri"),
      deskripsi: t("checkout.mandiriDesc"),
    },
    {
      id: "gopay",
      nama: t("checkout.gopay"),
      deskripsi: t("checkout.gopayDesc"),
    },
  ];

  // Alamat utama terpilih otomatis
  const [alamatId, setAlamatId] = useState<number | null>(
    addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null,
  );
  const [errorAlamat, setErrorAlamat] = useState("");

  const [pengiriman, setPengiriman] = useState("reguler");
  const [pembayaran, setPembayaran] = useState("qris");

  const [kodeVoucher, setKodeVoucher] = useState("");
  const [voucher, setVoucher] = useState<{
    kode: string;
    persen: number;
  } | null>(null);
  const [pesanVoucher, setPesanVoucher] = useState("");

  const router = useRouter();
  const [memproses, setMemproses] = useState(false);
  const [pesanError, setPesanError] = useState("");

  const alamat = addresses.find((a) => a.id === alamatId) ?? null;
  const alamatBelumLengkap = alamat ? !alamatLengkap(alamat) : false;

  const labelOpsi = (a: Address) =>
    `${a.label || t("checkout.addressFallback")}: ${a.recipient_name || t("checkout.noName")}${
      a.city ? `, ${a.city}` : ""
    }${a.is_default ? t("checkout.defaultSuffix") : ""}`;

  // ---------- Hitung total ----------
  const subtotal = items.reduce((t, i) => t + i.harga * i.jumlah, 0);
  const ongkir = opsiPengiriman.find((o) => o.id === pengiriman)?.biaya ?? 0;
  const diskon = voucher ? Math.round((subtotal * voucher.persen) / 100) : 0;
  const total = subtotal + ongkir - diskon;

  // ---------- Kirim pesanan ----------
  function tampilkanErrorAlamat(pesan: string) {
    setErrorAlamat(pesan);
    document
      .getElementById("bagian-alamat")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function kirimPesanan(e: React.FormEvent) {
    e.preventDefault();
    if (memproses) return;

    if (!alamat) {
      tampilkanErrorAlamat(t("checkout.needAddress"));
      return;
    }

    if (!alamatLengkap(alamat)) {
      tampilkanErrorAlamat(t("checkout.addressIncomplete"));
      return;
    }

    setErrorAlamat("");
    setPesanError("");
    setMemproses(true);

    try {
      const result = await createOrder({
        addressId: alamat.id,
        shippingMethod: pengiriman,
        paymentMethod: pembayaran,
        voucherCode: voucher?.kode ?? null,
        cartItems: items.map((item) => ({
          id: item.id,
          quantity: item.jumlah,
        })),
      });

      if (result.error || !result.orderId) {
        setPesanError(result.error ?? t("checkout.orderFail"));
        setMemproses(false);
        return;
      }

      router.push(`/checkout/sukses?id=${result.orderId}`);
      router.refresh();
    } catch {
      setPesanError(t("checkout.genericError"));
      setMemproses(false);
    }
  }

  // ---------- Voucher ----------
  function terapkanVoucher() {
    const kode = kodeVoucher.trim().toUpperCase();
    if (!kode) return;

    const persen = voucherContoh[kode];

    if (persen) {
      setVoucher({ kode, persen });
      setPesanVoucher("");
    } else {
      setVoucher(null);
      setPesanVoucher(t("checkout.invalidVoucher"));
    }
  }

  function hapusVoucher() {
    setVoucher(null);
    setKodeVoucher("");
    setPesanVoucher("");
  }

  return (
    <main className="min-h-screen bg-white text-[#1A1A1A] font-sans pb-24">
      {/* HEADER */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 pt-24 sm:pt-28">
        <Link
          href={kembaliKe}
          className="inline-flex items-center gap-2 text-[11px] text-[#8A8178] hover:text-[#1A1A1A] transition"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5">
            <path
              d="M16 10H4M9 5L4 10L9 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {kembaliKe.startsWith("/produk")
            ? t("checkout.backProduct")
            : t("checkout.backCart")}
        </Link>

        <h1 className="mt-5 text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {t("checkout.title")}
        </h1>
      </div>

      <form
        onSubmit={kirimPesanan}
        noValidate
        className="max-w-[1180px] mx-auto px-5 sm:px-8 mt-10 grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-16 items-start"
      >
        {/* =====================================================
            KOLOM KIRI
        ===================================================== */}
        <div className="space-y-10">
          {/* 1. ALAMAT */}
          <section
            id="bagian-alamat"
            className="pt-8 border-t border-[#EAE7E3]"
          >
            <SectionTitle no={1} judul={t("checkout.address")} />

            {alamat ? (
              <div className="space-y-4">
                {/* Dropdown hanya muncul kalau punya lebih dari satu alamat */}
                {addresses.length > 1 && (
                  <div>
                    <label
                      htmlFor="pilih-alamat"
                      className="block text-[11px] text-[#6F6A65] mb-2"
                    >
                      {t("checkout.sendTo")}
                    </label>

                    <select
                      id="pilih-alamat"
                      value={alamat.id}
                      onChange={(e) => {
                        setAlamatId(Number(e.target.value));
                        setErrorAlamat("");
                      }}
                      className={`${inputClass()} h-11`}
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {labelOpsi(a)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Detail alamat terpilih */}
                <div className="rounded-lg border border-[#1A1A1A] bg-[#FAF8F5] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {alamat.label && (
                      <span className="text-xs font-medium">
                        {alamat.label}
                      </span>
                    )}

                    {alamat.is_default && (
                      <span className="px-2 py-0.5 rounded-full bg-[#1A1A1A] text-white text-[9px]">
                        {t("checkout.default")}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[13px] font-medium">
                    {alamat.recipient_name}
                  </p>
                  <p className="text-[11px] text-[#8A8178]">{alamat.phone}</p>

                  <p className="mt-2 text-[13px] leading-6 text-[#4A463F]">
                    {alamat.full_address}
                  </p>
                  <p className="text-[13px] text-[#4A463F]">
                    {[alamat.city, alamat.province].filter(Boolean).join(", ")}{" "}
                    {alamat.postal_code}
                  </p>

                  {alamat.notes && (
                    <p className="mt-2 text-[11px] text-[#8A8178]">
                      {t("checkout.notes", { notes: alamat.notes })}
                    </p>
                  )}
                </div>

                {alamatBelumLengkap && (
                  <p className="text-[11px] text-[#B3261E]">
                    {t("checkout.incomplete")}
                  </p>
                )}

                <Link
                  href="/profile#alamat"
                  className="inline-block text-[11px] text-[#8A8178] underline underline-offset-4 hover:text-[#1A1A1A] transition"
                >
                  {t("checkout.manageAddress")}
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#DDD8D2] px-6 py-8 text-center">
                <p className="text-[13px] font-medium">
                  {t("checkout.noAddressTitle")}
                </p>
                <p className="mt-1 text-[11px] text-[#8A8178]">
                  {t("checkout.noAddressBody")}
                </p>

                <Link
                  href="/profile#alamat"
                  className="inline-flex items-center justify-center mt-4 h-10 px-5 rounded-full bg-[#1A1A1A] text-white text-[11px] font-medium hover:bg-[#302D2A] transition"
                >
                  {t("checkout.addAddress")}
                </Link>
              </div>
            )}

            {errorAlamat && (
              <p role="alert" className="mt-4 text-[11px] text-[#B3261E]">
                {errorAlamat}
              </p>
            )}
          </section>

          {/* 2. PENGIRIMAN */}
          <section className="pt-8 border-t border-[#EAE7E3]">
            <SectionTitle no={2} judul={t("checkout.shipping")} />

            <div className="space-y-3">
              {opsiPengiriman.map((opsi) => (
                <RadioCard
                  key={opsi.id}
                  name="pengiriman"
                  value={opsi.id}
                  checked={pengiriman === opsi.id}
                  onChange={setPengiriman}
                  title={opsi.nama}
                  description={opsi.estimasi}
                  trailing={rupiah(opsi.biaya)}
                />
              ))}
            </div>
          </section>

          {/* 3. PEMBAYARAN */}
          <section className="pt-8 border-t border-[#EAE7E3]">
            <SectionTitle no={3} judul={t("checkout.payment")} />

            <div className="space-y-3">
              {opsiPembayaran.map((opsi) => (
                <RadioCard
                  key={opsi.id}
                  name="pembayaran"
                  value={opsi.id}
                  checked={pembayaran === opsi.id}
                  onChange={setPembayaran}
                  title={opsi.nama}
                  description={opsi.deskripsi}
                />
              ))}
            </div>
          </section>
        </div>

        {/* =====================================================
            KOLOM KANAN: RINGKASAN
        ===================================================== */}
        <aside className="lg:sticky lg:top-24 rounded-[10px] bg-[#FAF8F5] p-6">
          <div className="flex items-center justify-between pb-5 border-b border-[#EAE7E3]">
            <h2 className="text-sm font-medium">{t("checkout.summary")}</h2>

            <Link
              href="/cart"
              className="text-[10px] text-[#8A8178] hover:text-[#1A1A1A] transition"
            >
              {t("checkout.change")}
            </Link>
          </div>

          {/* Penanda mode checkout */}
          {mode === "buynow" && (
            <p className="mt-3 rounded-lg bg-white border border-[#EAE7E3] px-3.5 py-2.5 text-[11px] leading-5 text-[#6F6A65]">
              {t("checkout.buynowNote")}
            </p>
          )}

          {/* ITEM */}
          <ul className="py-5 space-y-4 border-b border-[#EAE7E3]">
            {items.map((item) => (
              <li key={item.id} className="flex gap-4">
                <div className="w-16 aspect-[4/5] shrink-0 overflow-hidden rounded-md bg-[#E9E5E0]">
                  {item.gambar && (
                    <img
                      src={item.gambar}
                      alt={item.nama}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-5">{item.nama}</p>
                  <p className="mt-0.5 text-[11px] text-[#8A8178]">
                    {[
                      item.ukuran && t("product.sizeWith", { size: item.ukuran }),
                      item.warna,
                    ]
                      .filter(Boolean)
                      .join(", ") || t("checkout.detailNotAvailable")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#8A8178]">
                    {t("checkout.quantityLabel", { qty: item.jumlah })}
                  </p>
                </div>

                <p className="text-xs">{rupiah(item.harga * item.jumlah)}</p>
              </li>
            ))}
          </ul>

          {/* VOUCHER */}
          <div className="py-5 border-b border-[#EAE7E3]">
            {voucher ? (
              <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                <p className="text-xs">
                  {t("checkout.voucherUsed", { code: voucher.kode })}
                </p>

                <button
                  type="button"
                  onClick={hapusVoucher}
                  className="text-[10px] text-[#8A8178] hover:text-[#1A1A1A] transition cursor-pointer"
                >
                  {t("checkout.remove")}
                </button>
              </div>
            ) : (
              <>
                <label
                  htmlFor="voucher"
                  className="block text-[11px] text-[#6F6A65] mb-2"
                >
                  {t("checkout.voucherCode")}
                </label>

                <div className="flex gap-2">
                  <input
                    id="voucher"
                    value={kodeVoucher}
                    onChange={(e) => setKodeVoucher(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        terapkanVoucher();
                      }
                    }}
                    placeholder={t("checkout.enterCode")}
                    className={`${inputClass(pesanVoucher)} h-10 flex-1 min-w-0 uppercase placeholder:normal-case`}
                  />

                  <button
                    type="button"
                    onClick={terapkanVoucher}
                    className="h-10 px-4 rounded-lg border border-[#1A1A1A] text-[11px] font-medium hover:bg-[#1A1A1A] hover:text-white transition cursor-pointer"
                  >
                    {t("checkout.apply")}
                  </button>
                </div>

                {pesanVoucher && (
                  <p className="mt-1.5 text-[11px] text-[#B3261E]">
                    {pesanVoucher}
                  </p>
                )}
              </>
            )}
          </div>

          {/* RINCIAN */}
          <dl className="py-5 space-y-3 text-xs border-b border-[#EAE7E3]">
            <div className="flex justify-between">
              <dt className="text-[#6F6A65]">{t("checkout.subtotal")}</dt>
              <dd>{rupiah(subtotal)}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-[#6F6A65]">{t("checkout.shippingCost")}</dt>
              <dd>{rupiah(ongkir)}</dd>
            </div>

            {diskon > 0 && (
              <div className="flex justify-between">
                <dt className="text-[#6F6A65]">{t("checkout.discount")}</dt>
                <dd>-{rupiah(diskon)}</dd>
              </div>
            )}
          </dl>

          <div className="flex items-center justify-between pt-5">
            <span className="text-sm font-medium">{t("checkout.total")}</span>
            <span className="text-lg font-medium">{rupiah(total)}</span>
          </div>

          <button
            type="submit"
            disabled={memproses}
            className="
              mt-6 w-full h-12 rounded-full bg-[#1A1A1A] text-white text-xs font-medium
              hover:bg-[#302D2A] transition
              disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer
            "
          >
            {memproses ? t("checkout.processingOrder") : t("checkout.placeOrder")}
          </button>

          {pesanError && (
            <p role="alert" className="mt-3 text-[11px] text-[#B3261E]">
              {pesanError}
            </p>
          )}

          <p className="mt-4 text-[10px] leading-5 text-center text-[#8A8178]">
            {t("checkout.termsNote")}
          </p>
        </aside>
      </form>
    </main>
  );
}
