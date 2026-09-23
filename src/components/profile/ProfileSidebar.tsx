"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { uploadAvatar } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { useI18n, dateLocale } from "@/lib/i18n";

type ProfileSidebarProps = {
  email: string;
  name: string;
  inisial: string;
  avatarUrl?: string;
  createdAt?: string;
  bergabungSejak?: string;
  isAdmin?: boolean;
};

const initialState = { error: null, success: false };

export default function ProfileSidebar({
  email,
  name,
  inisial,
  avatarUrl,
  createdAt,
  bergabungSejak,
  isAdmin = false,
}: ProfileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useI18n();

  const [state, formAction, isPending] = useActionState(
    uploadAvatar,
    initialState,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Logout di client: bersihkan sesi supabase lalu kembali ke beranda.
  const [supabase] = useState(() => createClient());
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const formattedBergabung = createdAt
    ? new Date(createdAt).toLocaleDateString(dateLocale(locale), {
        month: "long",
        year: "numeric",
      })
    : bergabungSejak ?? "";

  const menu = [
    {
      href: "/profile",
      label: t("account.profile"),
      match: (p: string) => p === "/profile",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path
            d="M4.5 20c1.4-3.4 4.4-5.5 7.5-5.5s6.1 2.1 7.5 5.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      href: "/pesanan",
      label: t("account.orders"),
      match: (p: string) => p === "/pesanan" || p.startsWith("/pesanan/"),
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
          <circle cx="9" cy="21" r="1" />
          <circle cx="18" cy="21" r="1" />
        </svg>
      ),
    },
    {
      href: "/lemari",
      label: t("account.closet"),
      match: (p: string) => p === "/lemari" || p.startsWith("/lemari/"),
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 3v18M15 3v18" />
        </svg>
      ),
    },
    {
      href: "/outfit-saya",
      label: t("account.outfit"),
      match: (p: string) =>
        p === "/outfit-saya" || p.startsWith("/outfit-saya/"),
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16.5 4 12 7.2 7.5 4 3.5 6.8 6.2 9.2V20.2c0 .4.4.8.8.8h10c.4 0 .8-.4.8-.8V9.2l2.7-2.4L16.5 4Z" />
          <path d="M9.2 21V10.4c0-1.4 1.2-2.4 2.8-2.4s2.8 1 2.8 2.4V21" />
        </svg>
      ),
    },
    {
      href: "/chat",
      label: t("account.chat"),
      match: (p: string) => p === "/chat" || p.startsWith("/chat/"),
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
  ];

  function handleFileChange() {
    if (!fileInputRef.current?.files?.[0]) return;
    formRef.current?.requestSubmit();

    setTimeout(() => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 0);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-6 text-center">
        <div className="relative w-20 h-20 mx-auto">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            aria-label={t("account.changePhoto")}
            title={t("account.clickPhoto")}
            className="group relative w-20 h-20 rounded-full overflow-hidden border border-[#E7E5E0] bg-[#1E1C18] cursor-pointer flex items-center justify-center transition disabled:opacity-70"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL storage eksternal, konsisten dengan <img> lain di proyek ini
              <img
                src={avatarUrl}
                alt={name || t("account.changePhoto")}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-2xl font-semibold">
                {inisial}
              </span>
            )}

            {/* Overlay hover: ikon kamera / spinner saat mengunggah */}
            <span
              className={`absolute inset-0 flex items-center justify-center transition ${
                isPending ? "bg-black/35" : "bg-black/35 opacity-0 group-hover:opacity-100"
              }`}
            >
              {isPending ? (
                <span className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                  <path d="m15 5 4 4" />
                </svg>
              )}
            </span>
          </button>

          {/* Form + input file tersembunyi untuk membuka file explorer */}
          <form ref={formRef} action={formAction} className="hidden">
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              onChange={handleFileChange}
            />
          </form>
        </div>

        <p className="text-[11px] text-[#8B8478] mt-2">
          {isPending ? t("account.uploading") : t("account.clickPhoto")}
        </p>

        {state?.success && (
          <p className="text-xs text-[#2E7D32] mt-1">
            {t("account.photoUpdated")}
          </p>
        )}
        {state?.error && (
          <p className="text-xs text-[#B23B3B] mt-1">{state.error}</p>
        )}

        <p className="font-semibold text-lg mt-4">{name || t("account.faureUser")}</p>
        <p className="text-sm text-[#8B8478] break-words mt-1">{email}</p>
        {formattedBergabung && (
          <p className="text-[11px] text-[#8B8478] mt-3">
            {t("account.joined", { date: formattedBergabung })}
          </p>
        )}
      </div>

      <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-3">
        <nav className="space-y-1 text-sm">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition ${
                item.match(pathname)
                  ? "bg-[#1E1C18] text-white"
                  : "text-[#333] hover:bg-[#F3F1EC]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1E1C18] text-white hover:bg-[#3A362F] transition mt-1"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
              <span className="flex-1">{t("account.admin")}</span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 4L13 10L7 16" />
              </svg>
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition text-[#B23B3B] hover:bg-[#F9EAEA]"
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
            {t("account.logout")}
          </button>
        </nav>
      </div>
    </div>
  );
}
