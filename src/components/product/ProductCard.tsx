"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/LocaleProvider";

type ProductCardProps = {
  id: number;
  nama: string;
  harga: number;
  kategori?: string;
  gambar?: string;
};

const rupiah = (angka: number) =>
  "Rp" + Math.round(angka).toLocaleString("id-ID");

export default function ProductCard({
  id,
  nama,
  harga,
  kategori,
  gambar,
}: ProductCardProps) {
  const { t } = useI18n();

  return (
    <article className="group">
      <Link
        href={`/produk/${id}`}
        aria-label={t("product.viewDetailOf", { name: nama })}
        className="block rounded-[12px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1A1A1A]"
      >
        {/* FOTO */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-[12px] bg-[#F3F0EB]">
          {gambar ? (
            <img
              src={gambar}
              alt={nama}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            // Tampilan cadangan kalau produk belum punya foto
            <div className="flex h-full w-full items-center justify-center text-[#C9C2B8]">
              <svg
                viewBox="0 0 64 64"
                fill="none"
                aria-hidden="true"
                className="h-14 w-14"
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
          )}

          {/* Lapisan gelap tipis supaya tombol di atas foto terbaca */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />

          {/* Tombol saat kursor diarahkan ke kartu */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 justify-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-5 py-2.5 text-[11px] font-medium text-[#1A1A1A] shadow-sm">
              {t("product.viewDetail")}
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="h-3.5 w-3.5"
              >
                <path
                  d="M4 10H16M11 5L16 10L11 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* INFO */}
        <div className="pt-3.5">
          {kategori && (
            <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-[#8A8178]">
              {kategori}
            </p>
          )}

          {/* min-h menjaga tinggi kartu tetap sama walau nama 1 atau 2 baris */}
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-5 text-[#1A1A1A]">
            {nama}
          </h3>

          <p className="mt-1.5 text-[13px] text-[#1A1A1A]">{rupiah(harga)}</p>
        </div>
      </Link>
    </article>
  );
}
