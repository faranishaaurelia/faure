"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/LocaleProvider";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="relative z-0 w-full bg-[#EAE4DC] border-t border-b border-black">
      <div className="site-container py-14">
        <div className="grid grid-cols-2 md:grid-cols-[auto_1fr_1fr_1fr] gap-10 md:gap-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-5">
              <img
                src="/images/logo.png"
                alt="Faure"
                className="h-9 md:h-10 w-auto object-contain"
              />
            </Link>
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-[#1E1C18] text-white flex items-center justify-center hover:bg-black transition"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle
                    cx="17.5"
                    cy="6.5"
                    r="0.8"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Email"
                className="w-10 h-10 rounded-full bg-[#1E1C18] text-white flex items-center justify-center hover:bg-black transition"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#2D2B2A] font-bold mb-5 border-b border-[#2D2B2A] inline-block pb-1">
              {t("footer.shop")}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-[#1E1C18] font-medium mt-2">
              <Link href="/produk?kategori=kemeja" className="hover:text-[#8B6B5A]">
                {t("footer.shirt")}
              </Link>
              <Link href="/produk?kategori=rok" className="hover:text-[#8B6B5A]">
                {t("footer.skirt")}
              </Link>
              <Link href="/produk?kategori=kaus" className="hover:text-[#8B6B5A]">
                {t("footer.tee")}
              </Link>
              <Link href="/produk?kategori=jaket" className="hover:text-[#8B6B5A]">
                {t("footer.jacket")}
              </Link>
              <Link href="/produk?kategori=celana" className="hover:text-[#8B6B5A]">
                {t("footer.pants")}
              </Link>
              <Link href="/produk?kategori=sweater" className="hover:text-[#8B6B5A]">
                {t("footer.sweater")}
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#2D2B2A] font-bold mb-5 border-b border-[#2D2B2A] inline-block pb-1">
              {t("footer.explore")}
            </p>
            <ul className="space-y-3 text-sm text-[#1E1C18] font-medium mt-2">
              <li>
                <Link href="/produk" className="hover:text-[#8B6B5A]">
                  {t("footer.collection")}
                </Link>
              </li>
              <li>
                <Link href="/outfit" className="hover:text-[#8B6B5A]">
                  {t("footer.outfit")}
                </Link>
              </li>
              <li>
                <Link href="/outfit/buat" className="hover:text-[#8B6B5A]">
                  {t("footer.mixMatch")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#2D2B2A] font-bold mb-5 border-b border-[#2D2B2A] inline-block pb-1">
              {t("footer.help")}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-[#1E1C18] font-medium mt-2">
              <a href="#" className="hover:text-[#8B6B5A]">
                {t("footer.faq")}
              </a>
              <a href="#" className="hover:text-[#8B6B5A] whitespace-nowrap">
                {t("footer.returns")}
              </a>
              <a href="#" className="hover:text-[#8B6B5A]">
                {t("footer.howToShop")}
              </a>
              <a href="#" className="hover:text-[#8B6B5A]">
                {t("footer.trackOrder")}
              </a>
              <a href="#" className="hover:text-[#8B6B5A]">
                {t("footer.howToPay")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
