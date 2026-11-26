"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/products",
    label: "Produk",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    href: "/admin/categories",
    label: "Kategori",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 6h16M4 12h10M4 18h7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/admin/orders",
    label: "Pesanan",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
        <circle cx="9" cy="21" r="1" />
        <circle cx="18" cy="21" r="1" />
      </svg>
    ),
  },
  {
    href: "/admin/refunds",
    label: "Refund",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.4" />
      </svg>
    ),
  },
  {
    href: "/admin/reviews",
    label: "Ulasan",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 3l2.2 6.6H21l-5.4 3.9 2.1 6.5L12 16.8 6.3 20l2.1-6.5L3 9.6h6.8L12 3z" />
      </svg>
    ),
  },
  {
    href: "/admin/chat",
    label: "Chat",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Pengguna",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 20c1.4-3.4 4.4-5.5 7.5-5.5s6.1 2.1 7.5 5.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function MenuItem({
  item,
  pathname,
  badge,
}: {
  item: { href: string; label: string; icon: React.ReactNode };
  pathname: string;
  badge?: number;
}) {
  const aktif = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
        aktif
          ? "bg-[#F7F3EE] text-[#1E1C18]"
          : "text-[#E8DFD6] hover:bg-white/10 hover:text-white"
      }`}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-[#B3261E] px-1.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminSidebar({
  displayName,
  refundPending = 0,
  chatUnread = 0,
}: {
  displayName: string;
  refundPending?: number;
  chatUnread?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const inisial = displayName.trim().charAt(0).toUpperCase() || "A";

  // Logout di client: bersihkan sesi supabase lalu kembali ke beranda.
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-[284px] shrink-0 flex-col bg-[#1E1C18] text-[#F7F3EE]">
      <div className="border-b border-white/10 px-4 py-4">
        <Link href="/admin/dashboard" className="block">
          <img
            src="/images/logo.png"
            alt="Faure"
            className="h-6 w-auto brightness-0 invert"
          />
        </Link>
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-[#C4B5A8]">
          Panel Admin
        </p>
      </div>

      <nav className="inner-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {menuItems.map((item) => (
          <MenuItem
            key={item.href}
            item={item}
            pathname={pathname}
            badge={
              item.href === "/admin/refunds"
                ? refundPending
                : item.href === "/admin/chat"
                  ? chatUnread
                  : undefined
            }
          />
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F3EE] text-[12px] font-semibold text-[#1E1C18]">
            {inisial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium">{displayName}</p>
            <p className="text-[10px] text-[#C4B5A8]">Administrator</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 rounded-lg px-2 py-1.5 text-left text-[12px] font-medium text-[#E8C4C0] transition hover:bg-white/10"
          >
            Keluar
          </button>
          <Link
            href="/"
            className="rounded-lg px-2 py-1.5 text-[11px] text-[#C4B5A8] transition hover:text-[#F7F3EE]"
          >
            Lihat toko
          </Link>
        </div>
      </div>
    </aside>
  );
}
