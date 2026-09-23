import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT, dateLocale } from "@/lib/i18n/server";
import {
  formatTanggalWaktu,
  kodePesanan,
  labelMetodeBayar,
  rupiah,
} from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function CheckoutSuksesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    redirect("/pesanan");
  }

  const { t, locale } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, total, payment_method, payment_deadline, created_at, order_items ( id )",
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) {
    redirect("/pesanan");
  }

  const jumlahItem = Array.isArray(order.order_items)
    ? order.order_items.length
    : 0;

  return (
    <main className="min-h-screen bg-white text-[#1A1A1A] font-sans">
      <div className="site-container max-w-[560px] pt-32 pb-24">
        <div className="rounded-2xl border border-[#EAE7E3] bg-[#FAF8F5] px-6 py-12 sm:px-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#1A1A1A] text-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path
                d="M5 12.5L10 17.5L19 7.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-[#8A8178]">
            {t("checkout.successEyebrow")}
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-medium tracking-[-0.03em]">
            {t("checkout.successTitle")}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#6F6A65]">
            {t("checkout.successBody")}
          </p>

          <div className="mt-8 text-left rounded-xl bg-white border border-[#EAE7E3] p-5 space-y-3 text-[13px]">
            <div className="flex justify-between gap-4">
              <span className="text-[#8A8178]">{t("checkout.orderCode")}</span>
              <span className="font-medium">{kodePesanan(order.id)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#8A8178]">{t("checkout.payTotal")}</span>
              <span className="font-medium">{rupiah(Number(order.total))}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#8A8178]">{t("checkout.method")}</span>
              <span className="font-medium text-right">
                {labelMetodeBayar(order.payment_method)}
              </span>
            </div>
            {jumlahItem > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-[#8A8178]">{t("checkout.items")}</span>
                <span className="font-medium">
                  {t("checkout.itemsCount", { count: jumlahItem })}
                </span>
              </div>
            )}
            {order.payment_deadline && (
              <div className="flex justify-between gap-4">
                <span className="text-[#8A8178]">{t("checkout.payBefore")}</span>
                <span className="font-medium text-right">
                  {formatTanggalWaktu(order.payment_deadline, dateLocale(locale))}
                </span>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/pesanan/${order.id}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#1A1A1A] text-white text-xs font-medium hover:bg-[#302D2A] transition"
            >
              {t("checkout.viewOrder")}
            </Link>
            <Link
              href="/produk"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-[#DDD8D2] text-[#4A463F] text-xs font-medium hover:border-[#1A1A1A] transition"
            >
              {t("checkout.moreProducts")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
