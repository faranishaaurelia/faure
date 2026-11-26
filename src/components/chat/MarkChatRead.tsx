"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markChatRead } from "@/lib/actions/chat";

// Menandai pesan pelanggan di room ini sebagai terbaca, lalu memuat ulang
// halaman supaya badge di daftar chat dan sidebar ikut berubah.
export default function MarkChatRead({
  conversationId,
  unreadCount,
}: {
  conversationId: number;
  unreadCount: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (unreadCount <= 0) return;
    markChatRead(conversationId).then(() => router.refresh());
  }, [conversationId, unreadCount, router]);

  return null;
}
