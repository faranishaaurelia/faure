import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import NotaActions from "@/components/orders/NotaActions";
import NotaDokumen from "@/components/orders/NotaDokumen";
import { createClient } from "@/lib/supabase/server";
import { getT, dateLocale } from "@/lib/i18n/server";
import {
  angka,
  formatTanggalWaktu,
  infoItem,
  infoPembayaran,
  infoStatus,
  kodePesanan,
  labelMetodeBayar,
  labelPengiriman,
  type ItemRow,
} from "@/lib/orders";
import { notaLabels, type NotaData } from "@/lib/nota";

export const dynamic = "force-dynamic";

type NotaOrderRow = {
  id: number;
  status: string;
  total: number | string;
  created_at: string;
  address_id: number | null;
  shipping_method: string | null;
  shipping_cost: number | string | null;
  discount: number | string | null;
  voucher_code: string | null;
  payment_method: string | null;
  payment_status: string | null;
  paid_at: string | null;
  tracking_number: string | null;
  midtrans_transaction_id: string | null;
  order_items: ItemRow[] | null;
};

type AlamatRow = {
  recipient_name: string | null;
  phone: string | null;
  full_address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
};

export default async function HalamanNota({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    notFound();
  }

  const { t, locale } = await getT();
  const lokale = dateLocale(locale);
  const labels = notaLabels(t);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      total,
      created_at,
      address_id,
      shipping_method,
      shipping_cost,
      discount,
      voucher_code,
      payment_method,
      payment_status,
      paid_at,
      tracking_number,
      midtrans_transaction_id,
      order_items (
        id,
        product_name_snapshot,
        price,
        quantity,
        product_variants (
          size,
          color,
          image_url,
          products ( id, name )
        )
      )
    `,
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Gagal mengambil nota pesanan:", error.message);
    notFound();
  }

  if (!data) {
    notFound();
  }

  const pesanan = data as unknown as NotaOrderRow;
  const status = infoStatus(pesanan.status, t);
  const bayar = infoPembayaran(pesanan.payment_status, status.key, t);

  if (bayar.key !== "dibayar") {
    return (
      <main className="min-h-screen bg-[#F7F3EE] px-5 py-28 text-[#1E1C18]">
        <div className="mx-auto max-w-[560px] rounded-[24px] border border-[#EAE7E3] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF4DB] text-[#8A5A00]">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path
                d="M12 8v5m0 3.5h.01M10.3 3.9 2.7 17.2A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mt-5 text-xl font-semibold">
            {labels.unavailableTitle}
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-[#6F6A65]">
            {labels.unavailableBody}
          </p>
          <Link
            href={`/pesanan/${pesanan.id}`}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#1A1A1A] px-6 text-xs font-medium text-white transition hover:bg-[#302D2A]"
          >
            {labels.backToOrder}
          </Link>
        </div>
      </main>
    );
  }

  // Alamat dan profil diambil terpisah, sama seperti halaman detail pesanan.
  let alamat: AlamatRow | null = null;
  if (pesanan.address_id) {
    const { data: alamatData } = await supabase
      .from("addresses")
      .select(
        "recipient_name, phone, full_address, city, province, postal_code, notes",
      )
      .eq("id", pesanan.address_id)
      .maybeSingle();
    alamat = (alamatData as AlamatRow | null) ?? null;
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const itemNota = (pesanan.order_items ?? []).map((baris) => {
    const info = infoItem(baris, t);
    return {
      nama: info.nama,
      detail: info.detail,
      jumlah: info.jumlah,
      harga: info.harga,
      total: info.harga * info.jumlah,
    };
  });

  const alamatBaris = [
    alamat?.full_address,
    [alamat?.city, alamat?.province].filter(Boolean).join(", "),
    alamat?.postal_code,
  ]
    .filter((baris): baris is string => Boolean(baris && baris.trim()))
    .map((baris) => baris.trim());

  const namaPelanggan =
    profil?.full_name ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ||
    alamat?.recipient_name ||
    user.email ||
    labels.notAvailable;

  const teleponPelanggan =
    profil?.phone ||
    (typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone
      : null) ||
    null;

  const nota: NotaData = {
    id: pesanan.id,
    kode: kodePesanan(pesanan.id),
    createdAt: formatTanggalWaktu(pesanan.created_at, lokale),
    paidAt: pesanan.paid_at
      ? formatTanggalWaktu(pesanan.paid_at, lokale)
      : null,
    printedAt: formatTanggalWaktu(new Date().toISOString(), lokale),
    transactionId: pesanan.midtrans_transaction_id,
    customerName: namaPelanggan,
    customerEmail: user.email ?? null,
    customerPhone: teleponPelanggan,
    paymentMethod: labelMetodeBayar(pesanan.payment_method),
    paymentStatus: bayar.label,
    shippingMethod: labelPengiriman(pesanan.shipping_method, t),
    trackingNumber: pesanan.tracking_number,
    recipient: alamat?.recipient_name ?? null,
    recipientPhone: alamat?.phone ?? null,
    addressLines: alamatBaris,
    shippingNotes: alamat?.notes ?? null,
    items: itemNota,
    subtotal: itemNota.reduce((n, i) => n + i.total, 0),
    shippingCost: angka(pesanan.shipping_cost),
    discount: angka(pesanan.discount),
    total: angka(pesanan.total),
    voucherCode: pesanan.voucher_code,
  };

  return (
    <main className="nota-print-page min-h-screen bg-[#F7F3EE] px-4 py-10 text-[#1E1C18] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-[820px]">
        <div className="nota-no-print mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A7B69]">
              {labels.paymentTitle} &amp; {labels.shippingTitle}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              {nota.kode}
            </h1>
          </div>
          <Link
            href={`/pesanan/${pesanan.id}`}
            className="text-[11px] text-[#6F6A65] underline underline-offset-4 transition hover:text-[#1E1C18]"
          >
            {labels.backToOrder}
          </Link>
        </div>

        <div className="nota-no-print mb-6 rounded-2xl border border-[#EAE7E3] bg-white p-4 shadow-sm">
          <NotaActions data={nota} labels={labels} />
        </div>

        <NotaDokumen data={nota} labels={labels} />
      </div>
    </main>
  );
}
