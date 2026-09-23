"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const menu = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.collection"), href: "/produk" },
    { label: t("nav.outfit"), href: "/outfit" },
  ];
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartBouncing, setCartBouncing] = useState(false);

  // Dibuat sekali supaya referensi stabil untuk useEffect & handler logout.
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  // Logout dilakukan di client (bukan server action) supaya sesi client
  // benar-benar dibersihkan & onAuthStateChange langsung meng-update state
  // navbar ke kondisi "belum login".
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  /*
   * Menerima event dari AddToCartForm
   * ketika produk berhasil ditambahkan ke keranjang.
   */
  useEffect(() => {
    const handleCartBounce = () => {
      setCartBouncing(false);

      // Sedikit delay supaya animasi bisa diputar ulang
      requestAnimationFrame(() => {
        setCartBouncing(true);
      });

      setTimeout(() => {
        setCartBouncing(false);
      }, 550);
    };

    window.addEventListener("faure-cart-bounce", handleCartBounce);

    return () => {
      window.removeEventListener("faure-cart-bounce", handleCartBounce);
    };
  }, []);

  const initial =
    user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "?";

  return (
    <header
      className="fixed top-0 left-0 w-full z-[9999] pt-5"
      style={{ zIndex: 9999 }}
    >
      <div className="site-container">
        <div className="bg-white rounded-[18px] h-[76px] px-4 sm:px-6 md:px-10 flex items-center justify-between shadow-sm">
          {/* LOGO */}
          <Link href="/" className="shrink-0 flex items-center">
            <img
              src="/images/logo.png"
              alt="Faure"
              className="w-[110px] h-auto"
            />
          </Link>

          {/* MENU */}
          <nav className="hidden md:flex items-center gap-5 text-[11px] tracking-wide uppercase">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-5 py-2 rounded-[8px] transition-all duration-200 ${
                  pathname === item.href
                    ? "bg-[#1E1C18] text-white"
                    : "text-[#222] hover:bg-[#1E1C18]/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* BAGIAN KANAN */}
          <div className="flex items-center gap-3 shrink-0">
            {/* SEARCH */}
            <div className="relative">
              <button
                type="button"
                aria-label={t("nav.search")}
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-[8px] transition-all duration-200 text-[#222] hover:bg-[#1E1C18]/10"
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>

              {searchOpen && (
                <form
                  action="/produk"
                  method="GET"
                  className="absolute right-0 top-[calc(100%+10px)] z-20 bg-white rounded-xl shadow-lg p-3 w-64 border border-black/5"
                >
                  <input
                    type="text"
                    name="q"
                    placeholder={t("nav.searchPlaceholder")}
                    autoFocus
                    className="w-full h-10 px-3 rounded-lg border border-[#E7E5E0] text-sm focus:outline-none focus:border-[#1E1C18]"
                  />
                </form>
              )}
            </div>

            {/* ================================= */}
            {/* KERANJANG */}
            {/* ================================= */}
            <Link
              id="cart-icon"
              href="/cart"
              aria-label={t("nav.cart")}
              className={`p-2 rounded-[8px] transition-all duration-200 ${
                pathname === "/cart"
                  ? "bg-[#1E1C18] text-white"
                  : "text-[#222] hover:bg-[#1E1C18]/10"
              } ${
                cartBouncing ? "scale-125 rotate-[-8deg]" : "scale-100 rotate-0"
              }`}
              style={{
                transitionDuration: "450ms",
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
                <circle cx="9" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>
            </Link>

            <LanguageSwitcher />

            {/* PEMBATAS */}
            <span className="hidden sm:block w-px h-5 bg-[#E7E5E0] mx-1" />

            {/* USER */}
            {user ? (
              <div className="flex items-center gap-2">
                {/* PROFILE */}
                <Link
                  href="/profile"
                  aria-label={t("nav.profile")}
                  className={`w-9 h-9 rounded-full overflow-hidden border border-[#E7E5E0] shrink-0 flex items-center justify-center ${
                    pathname === "/profile" ? "ring-2 ring-[#1E1C18]" : ""
                  }`}
                >
                  <span className="w-full h-full bg-[#1E1C18] text-white text-xs font-semibold flex items-center justify-center">
                    {initial}
                  </span>
                </Link>

                {/* LOGOUT */}
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label={t("nav.logout")}
                  title={t("nav.logout")}
                  className="p-2 rounded-[8px] transition-all duration-200 text-[#222] hover:bg-[#1E1C18]/10"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-[11px] tracking-wide uppercase text-[#222]">
                <Link
                  href="/login"
                  className={`hover:text-[#1E1C18] transition-colors ${
                    pathname === "/login" ? "font-semibold text-[#1E1C18]" : ""
                  }`}
                >
                  {t("nav.login")}
                </Link>

                <span className="text-gray-400">|</span>

                <Link
                  href="/register"
                  className={`hover:text-[#1E1C18] transition-colors ${
                    pathname === "/register"
                      ? "font-semibold text-[#1E1C18]"
                      : ""
                  }`}
                >
                  {t("nav.register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
