"use client";

import Link from "next/link";
import { useState } from "react";
import CartItemRow from "@/components/cart/CartItemRow";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type ItemKeranjang = {
  id: number;
  nama: string;
  ukuran: string | null;
  warna: string | null;
  harga: number;
  quantity: number;
  gambar: string | null;
};

function formatHarga(angka: number) {
  return `Rp ${angka.toLocaleString("id-ID")}`;
}

// Kotak centang bertema konsisten dengan CartItemRow
function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="cursor-pointer select-none" aria-label={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <span
        className={`
          w-5 h-5 rounded-md border flex items-center justify-center transition
          ${
            checked
              ? "bg-[#1E1C18] border-[#1E1C18]"
              : "bg-white border-[#D6D0C9] hover:border-[#1E1C18]"
          }
          peer-focus-visible:ring-2 peer-focus-visible:ring-[#1E1C18] peer-focus-visible:ring-offset-1
        `}
      >
        <svg
          className={`w-3 h-3 text-white transition ${checked ? "opacity-100" : "opacity-0"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M5 12.5L10 17.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}

export default function CartClient({ items }: { items: ItemKeranjang[] }) {
  const { t } = useI18n();

  // Semua item tercentang secara default (perilaku lama: checkout semua).
  const [terpilih, setTerpilih] = useState<Set<number>>(
    () => new Set(items.map((i) => i.id)),
  );

  // Jumlah yang mau di-checkout per item (default: semua qty di keranjang).
  const [qtyCheckout, setQtyCheckout] = useState<Record<number, number>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.quantity])),
  );

  const toggle = (id: number) =>
    setTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const semuaTerpilih = items.length > 0 && terpilih.size === items.length;

  const toggleSemua = () =>
    setTerpilih(semuaTerpilih ? new Set() : new Set(items.map((i) => i.id)));

  const setQty = (id: number, q: number) =>
    setQtyCheckout((prev) => ({ ...prev, [id]: Math.max(1, q) }));

  // Kombinasi pilihan: item + qty efektif
  const selection = items.map((item) => {
    const selected = terpilih.has(item.id);
    const qty = selected
      ? Math.min(qtyCheckout[item.id] ?? item.quantity, item.quantity)
      : 0;
    return { item, selected, qty };
  });

  const itemTerpilih = selection.filter((s) => s.selected);
  const totalQtyCheckout = itemTerpilih.reduce((t, s) => t + s.qty, 0);
  const subtotal = itemTerpilih.reduce((t, s) => t + s.item.harga * s.qty, 0);

  // Hanya produk yang dicentang (beserta qty-nya) yang dibawa ke checkout.
  const checkoutHref =
    itemTerpilih.length > 0
      ? `/checkout?items=${itemTerpilih
          .map((s) => `${s.item.id}:${s.qty}`)
          .join(",")}`
      : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
      {/* DAFTAR ITEM */}
      <div>
        {/* PILIH SEMUA */}
        <div className="flex items-center gap-2.5 px-1 pb-3">
          <Checkbox
            checked={semuaTerpilih}
            onChange={toggleSemua}
            label={semuaTerpilih ? t("cart.unselectAll") : t("cart.selectAll")}
          />
          <span className="text-xs text-[#656058]">
            {t("cart.selectAllCount", {
              selected: itemTerpilih.length,
              total: items.length,
            })}
          </span>
          {itemTerpilih.length > 0 && itemTerpilih.length < items.length && (
            <span className="text-[10px] text-[#8B8478]">
              {t("cart.onlyChecked")}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              {...item}
              selected={terpilih.has(item.id)}
              onToggleSelected={() => toggle(item.id)}
              qtyCheckout={Math.min(
                qtyCheckout[item.id] ?? item.quantity,
                item.quantity,
              )}
              onQtyCheckoutChange={(q) => setQty(item.id, q)}
            />
          ))}
        </div>
      </div>

      {/* RINGKASAN */}
      <aside className="bg-white rounded-2xl border border-black/5 p-6 h-fit sticky top-[130px]">
        <h2 className="font-bold text-lg mb-4">{t("cart.summary")}</h2>

        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between text-[#656058]">
            <span>{t("cart.selectedProducts")}</span>
            <span>
              {t("cart.productsPcs", {
                products: itemTerpilih.length,
                pcs: totalQtyCheckout,
              })}
            </span>
          </div>
          <div className="flex justify-between text-[#656058]">
            <span>{t("cart.subtotalPcs", { pcs: totalQtyCheckout })}</span>
            <span>{formatHarga(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#656058]">
            <span>{t("cart.shipping")}</span>
            <span>{t("cart.shippingLater")}</span>
          </div>
        </div>

        <div className="border-t border-[#F0F0F0] pt-4 mb-5 flex justify-between font-bold text-base">
          <span>{t("cart.total")}</span>
          <span>{formatHarga(subtotal)}</span>
        </div>

        {checkoutHref ? (
          <Link
            href={checkoutHref}
            className="flex w-full items-center justify-center bg-[#1E1C18] text-white text-sm font-medium py-3.5 rounded-full hover:bg-black transition cursor-pointer"
          >
            {t("cart.checkoutCount", { count: itemTerpilih.length })}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center bg-[#1E1C18] text-white text-sm font-medium py-3.5 rounded-full opacity-40 cursor-not-allowed"
          >
            {t("cart.checkout")}
          </button>
        )}

        {itemTerpilih.length === 0 && (
          <p className="mt-2 text-[10px] text-[#8B8478] text-center">
            {t("cart.needOne")}
          </p>
        )}
      </aside>
    </div>
  );
}