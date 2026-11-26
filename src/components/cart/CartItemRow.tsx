"use client";

import { useTransition } from "react";
import { updateCartQuantity, removeCartItem } from "@/lib/actions/cart";
import { useI18n } from "@/components/i18n/LocaleProvider";

type Props = {
  id: number;
  nama: string;
  ukuran: string | null;
  warna: string | null;
  harga: number;
  quantity: number;
  gambar: string | null;
  selected: boolean;
  onToggleSelected: () => void;
};

function formatHarga(angka: number) {
  return `Rp ${angka.toLocaleString("id-ID")}`;
}

export default function CartItemRow({
  id,
  nama,
  ukuran,
  warna,
  harga,
  quantity,
  gambar,
  selected,
  onToggleSelected,
}: Props) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const ubahJumlah = (baru: number) => {
    startTransition(() => {
      updateCartQuantity(id, baru);
    });
  };

  const hapus = () => {
    startTransition(() => {
      removeCartItem(id);
    });
  };

  return (
    <div
      className={`flex gap-4 items-center bg-white rounded-2xl border border-black/5 p-4 ${isPending ? "opacity-50" : ""}`}
    >
      <label
        className="shrink-0 cursor-pointer"
        aria-label={selected ? `${t("cart.unselectAll")} ${nama}` : `${t("cart.selectAll")} ${nama}`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelected}
          className="sr-only peer"
        />
        <span
          className={`
            w-5 h-5 rounded-md border flex items-center justify-center transition
            ${selected ? "bg-[#1E1C18] border-[#1E1C18]" : "bg-white border-[#D6D0C9] hover:border-[#1E1C18]"}
            peer-focus-visible:ring-2 peer-focus-visible:ring-[#1E1C18] peer-focus-visible:ring-offset-1
          `}
        >
          <svg
            className={`w-3 h-3 text-white transition ${selected ? "opacity-100" : "opacity-0"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M5 12.5L10 17.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </label>

      <div className="w-20 h-24 bg-[#EAE4DC] rounded-xl overflow-hidden shrink-0">
        {gambar && (
          <img src={gambar} alt={nama} className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex flex-grow min-w-0 self-stretch flex-col justify-center">
        <p className="font-semibold text-sm text-[#222222] line-clamp-1">
          {nama}
        </p>
        <p className="text-xs text-[#8B8478] mt-1">
          {ukuran && t("cart.size", { size: ukuran })}{" "}
          {warna && `• ${t("cart.color", { color: warna })}`}
        </p>
        <p className="font-bold text-sm text-[#1E1C18] mt-2">
          {formatHarga(harga)}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center border border-[#E7E5E0] rounded-full">
          <button
            onClick={() => ubahJumlah(quantity - 1)}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center text-[#4A4643] hover:bg-[#F0F0F0] rounded-l-full cursor-pointer"
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{quantity}</span>
          <button
            onClick={() => ubahJumlah(quantity + 1)}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center text-[#4A4643] hover:bg-[#F0F0F0] rounded-r-full cursor-pointer"
          >
            +
          </button>
        </div>

        <button
          onClick={hapus}
          disabled={isPending}
          aria-label={t("cart.deleteItem")}
          className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-full cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
