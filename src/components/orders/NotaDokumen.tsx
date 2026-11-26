import type { ReactNode } from "react";
import { rupiah } from "@/lib/orders";
import type { NotaData, NotaLabels } from "@/lib/nota";

type Props = {
  data: NotaData;
  labels: NotaLabels;
};

function Kepala({
  judul,
  kode,
  tagline,
}: {
  judul: string;
  kode: string;
  tagline: string;
}) {
  return (
    <header className="flex items-start justify-between gap-6 border-b border-[#EAE7E3] pb-5">
      <div>
        <p className="text-2xl font-semibold tracking-[0.2em] text-[#1E1C18]">
          FAURE
        </p>
        <p className="mt-1 text-[11px] text-[#8B8478]">{tagline}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A7B69]">
          {judul}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-[#1E1C18]">{kode}</p>
      </div>
    </header>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9A9389]">
        {label}
      </p>
      <p className="mt-1 break-words text-[12px] font-medium text-[#1E1C18]">
        {children}
      </p>
    </div>
  );
}

function Tabel({
  labels,
  items,
  denganHarga,
}: {
  labels: NotaLabels;
  items: NotaData["items"];
  denganHarga: boolean;
}) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr className="bg-[#F7F3EE] text-left text-[9px] uppercase tracking-[0.12em] text-[#8B8478]">
          <th className="w-8 px-2 py-2 font-semibold">{labels.no}</th>
          <th className="px-2 py-2 font-semibold">{labels.product}</th>
          <th className="w-12 px-2 py-2 text-right font-semibold">
            {labels.qty}
          </th>
          {denganHarga && (
            <>
              <th className="w-28 px-2 py-2 text-right font-semibold">
                {labels.price}
              </th>
              <th className="w-28 px-2 py-2 text-right font-semibold">
                {labels.amount}
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td
              colSpan={denganHarga ? 5 : 3}
              className="px-2 py-4 text-center text-[#8B8478]"
            >
              {labels.notAvailable}
            </td>
          </tr>
        ) : (
          items.map((item, i) => (
            <tr key={i} className="border-b border-[#EFEDE8] align-top">
              <td className="px-2 py-2.5 text-[#8B8478]">{i + 1}</td>
              <td className="px-2 py-2.5">
                <p className="font-medium text-[#1E1C18]">{item.nama}</p>
                {item.detail && (
                  <p className="mt-0.5 text-[10px] text-[#8B8478]">
                    {item.detail}
                  </p>
                )}
              </td>
              <td className="px-2 py-2.5 text-right">{item.jumlah}</td>
              {denganHarga && (
                <>
                  <td className="px-2 py-2.5 text-right">
                    {rupiah(item.harga)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-medium">
                    {rupiah(item.total)}
                  </td>
                </>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function BarisTotal({
  label,
  nilai,
  tebal,
}: {
  label: string;
  nilai: string;
  tebal?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-6 py-1 text-[12px] ${
        tebal ? "font-semibold text-[#1E1C18]" : "text-[#6F6A65]"
      }`}
    >
      <span>{label}</span>
      <span>{nilai}</span>
    </div>
  );
}

export default function NotaDokumen({ data, labels }: Props) {
  return (
    <div className="nota-document mx-auto w-full max-w-[820px] space-y-6">
      {/* ==================== NOTA PEMBAYARAN ==================== */}
      <article className="nota-sheet rounded-[20px] border border-[#EAE7E3] bg-white p-7 shadow-sm md:p-10">
        <Kepala
          judul={labels.paymentTitle}
          kode={data.kode}
          tagline={labels.tagline}
        />

        <section className="mt-6 grid gap-6 border-b border-[#EFEDE8] pb-6 sm:grid-cols-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9A9389]">
              {labels.billTo}
            </p>
            <p className="mt-2 text-[13px] font-semibold text-[#1E1C18]">
              {data.customerName}
            </p>
            {data.customerEmail && (
              <p className="mt-0.5 text-[11px] text-[#6F6A65]">
                {data.customerEmail}
              </p>
            )}
            {data.customerPhone && (
              <p className="mt-0.5 text-[11px] text-[#6F6A65]">
                {data.customerPhone}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Info label={labels.orderDate}>{data.createdAt}</Info>
            <Info label={labels.paidOn}>
              {data.paidAt ?? labels.notAvailable}
            </Info>
            <Info label={labels.status}>{data.paymentStatus}</Info>
            <Info label={labels.paymentMethod}>{data.paymentMethod}</Info>
            <div className="col-span-2">
              <Info label={labels.transactionId}>
                {data.transactionId ?? labels.notAvailable}
              </Info>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9A9389]">
            {labels.item}
          </p>
          <Tabel labels={labels} items={data.items} denganHarga />
        </section>

        <section className="mt-6 grid gap-6 sm:grid-cols-[1fr_260px]">
          <div className="rounded-xl bg-[#FAF8F5] p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9A9389]">
              {labels.notes}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-[#6F6A65]">
              {labels.paymentNote}
            </p>
          </div>
          <div>
            <BarisTotal label={labels.subtotal} nilai={rupiah(data.subtotal)} />
            <BarisTotal
              label={labels.shippingCost}
              nilai={rupiah(data.shippingCost)}
            />
            {data.discount > 0 && (
              <BarisTotal
                label={`${labels.discount}${
                  data.voucherCode ? ` (${data.voucherCode})` : ""
                }`}
                nilai={`-${rupiah(data.discount)}`}
              />
            )}
            <div className="mt-2 border-t border-[#1E1C18] pt-2">
              <BarisTotal
                label={labels.total}
                nilai={rupiah(data.total)}
                tebal
              />
            </div>
          </div>
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE7E3] pt-4 text-[10px] text-[#8B8478]">
          <span>
            {labels.printedOn}: {data.printedAt}
          </span>
          <span>{labels.thankYou}</span>
        </footer>
      </article>

      {/* ==================== NOTA PENGIRIMAN ==================== */}
      <article className="nota-sheet rounded-[20px] border border-[#EAE7E3] bg-white p-7 shadow-sm md:p-10">
        <Kepala
          judul={labels.shippingTitle}
          kode={data.kode}
          tagline={labels.tagline}
        />

        <section className="mt-6 grid gap-6 border-b border-[#EFEDE8] pb-6 sm:grid-cols-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9A9389]">
              {labels.shipTo}
            </p>
            <p className="mt-2 text-[13px] font-semibold text-[#1E1C18]">
              {data.recipient || data.customerName}
            </p>
            {data.recipientPhone && (
              <p className="mt-0.5 text-[11px] text-[#6F6A65]">
                {labels.phone}: {data.recipientPhone}
              </p>
            )}
            <div className="mt-3 space-y-0.5 text-[11px] leading-5 text-[#4A463F]">
              {data.addressLines.length === 0 ? (
                <p className="text-[#8B8478]">{labels.notAvailable}</p>
              ) : (
                data.addressLines.map((baris, i) => <p key={i}>{baris}</p>)
              )}
            </div>
            {data.shippingNotes && (
              <p className="mt-2 text-[10px] italic text-[#8B8478]">
                {data.shippingNotes}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Info label={labels.orderDate}>{data.createdAt}</Info>
            <Info label={labels.shippingMethod}>{data.shippingMethod}</Info>
            <Info label={labels.trackingNumber}>
              {data.trackingNumber ?? labels.notAvailable}
            </Info>
            <Info label={labels.paymentMethod}>{data.paymentMethod}</Info>
          </div>
        </section>

        <section className="mt-6">
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9A9389]">
            {labels.item}
          </p>
          <Tabel labels={labels} items={data.items} denganHarga={false} />
          <p className="mt-3 text-right text-[11px] font-semibold">
            {labels.qty}: {data.items.reduce((n, i) => n + i.jumlah, 0)}
          </p>
        </section>

        <div className="mt-6 rounded-xl bg-[#FAF8F5] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9A9389]">
            {labels.notes}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-[#6F6A65]">
            {labels.shippingNote}
          </p>
        </div>

        <section className="mt-10 grid grid-cols-2 gap-10">
          <div>
            <div className="border-t border-[#CFC9C0] pt-2 text-[10px] text-[#8B8478]">
              {labels.senderSignature}
            </div>
          </div>
          <div>
            <div className="border-t border-[#CFC9C0] pt-2 text-[10px] text-[#8B8478]">
              {labels.receiverSignature}
            </div>
          </div>
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE7E3] pt-4 text-[10px] text-[#8B8478]">
          <span>
            {labels.printedOn}: {data.printedAt}
          </span>
          <span>{labels.thankYou}</span>
        </footer>
      </article>
    </div>
  );
}
