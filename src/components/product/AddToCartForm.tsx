"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { addToCart, checkoutNow } from "@/lib/actions/cart";
import { useI18n } from "@/components/i18n/LocaleProvider";

type Variant = {
  id: number;
  size: string | null;
  color: string | null;
  stock: number;
};

export default function AddToCartForm({ variants }: { variants: Variant[] }) {
  const { t } = useI18n();
  const ukuranUnik = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const warnaUnik = [...new Set(variants.map((v) => v.color).filter(Boolean))];

  const [ukuran, setUkuran] = useState(ukuranUnik[0] ?? null);
  const [warna, setWarna] = useState(warnaUnik[0] ?? null);
  const [jumlah, setJumlah] = useState(1);
  const [pesan, setPesan] = useState<string | null>(null);
  // Menandai kalau item sudah dimasukkan ke keranjang dari halaman ini.
  const [pernahTambah, setPernahTambah] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [checkoutPending, setCheckoutPending] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const variantTerpilih = variants.find(
    (v) =>
      (ukuranUnik.length === 0 || v.size === ukuran) &&
      (warnaUnik.length === 0 || v.color === warna),
  );

  const stokTersedia = variantTerpilih?.stock ?? 0;

  const tambahKeKeranjang = () => {
    if (!variantTerpilih) return;
    setPesan(null);
    startTransition(async () => {
      const result = await addToCart(variantTerpilih.id, jumlah);
      if (result?.error) {
        setPesan(result.error);
      } else {
        setPesan(t("product.addedToCart"));
        setPernahTambah(true);
        router.refresh();
      }
    });
  };

  const checkoutSekarang = async () => {
    if (!variantTerpilih || checkoutPending) return;
    setPesan(null);
    setCheckoutPending(true);
    const result = await checkoutNow(variantTerpilih.id, jumlah);
    if (result?.error || !result?.cartId) {
      setPesan(result?.error ?? t("outfit.checkoutFail"));
      setCheckoutPending(false);
      return;
    }
    const asal = pernahTambah ? "/cart" : pathname;
    router.push(
      `/checkout?from=${encodeURIComponent(asal)}&items=${result.cartId}:${result.quantity ?? jumlah}&mode=buynow`,
    );
  };

  return (
    <div className="space-y-5">
      {ukuranUnik.length > 0 && (
        <div>
          <p className="text-sm font-medium text-[#2b2b2b] mb-2">{t("product.size")}</p>
          <div className="flex flex-wrap gap-2">
            {ukuranUnik.map((s) => (
              <button
                key={s}
                onClick={() => setUkuran(s)}
                className={`px-4 py-2 rounded-full border text-sm transition ${
                  ukuran === s
                    ? "bg-[#1E1C18] border-[#1E1C18] text-white"
                    : "border-[#E7E5E0] text-[#4A4643] hover:border-[#1E1C18]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {warnaUnik.length > 0 && (
        <div>
          <p className="text-sm font-medium text-[#2b2b2b] mb-2">{t("product.color")}</p>
          <div className="flex flex-wrap gap-2">
            {warnaUnik.map((c) => (
              <button
                key={c}
                onClick={() => setWarna(c)}
                className={`px-4 py-2 rounded-full border text-sm transition ${
                  warna === c
                    ? "bg-[#1E1C18] border-[#1E1C18] text-white"
                    : "border-[#E7E5E0] text-[#4A4643] hover:border-[#1E1C18]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-[#2b2b2b] mb-2">{t("product.quantity")}</p>
        <div className="flex items-center border border-[#E7E5E0] rounded-full w-fit">
          <button
            onClick={() => setJumlah((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-[#4A4643] hover:bg-[#F0F0F0] rounded-l-full cursor-pointer"
          >
            −
          </button>
          <span className="w-10 text-center text-sm">{jumlah}</span>
          <button
            onClick={() => setJumlah((q) => Math.min(stokTersedia, q + 1))}
            className="w-10 h-10 flex items-center justify-center text-[#4A4643] hover:bg-[#F0F0F0] rounded-r-full cursor-pointer"
          >
            +
          </button>
        </div>
        <p className="text-xs text-[#8B8478] mt-1">
          {stokTersedia > 0
            ? t("product.stockAvailable", { count: stokTersedia })
            : t("product.variantOut")}
        </p>
      </div>

      {pesan && (
        <p
          className={`text-sm ${
            pesan.includes("Berhasil") || pesan.includes("Added")
              ? "text-green-600"
              : "text-red-500"
          }`}
        >
          {pesan}
        </p>
      )}

      <button
        onClick={tambahKeKeranjang}
        disabled={isPending || stokTersedia === 0 || !variantTerpilih}
        className="w-full bg-[#1E1C18] text-white text-sm font-medium py-4 rounded-full hover:bg-black transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {isPending ? t("product.adding") : t("product.addToCart")}
      </button>

      <button
        onClick={checkoutSekarang}
        disabled={checkoutPending || stokTersedia === 0 || !variantTerpilih}
        className="w-full border border-[#1E1C18] bg-[#1E1C18] text-white text-sm font-medium py-4 rounded-full hover:bg-[#34302C] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {checkoutPending ? t("product.goingCheckout") : t("product.checkoutNow")}
      </button>
    </div>
  );
}
