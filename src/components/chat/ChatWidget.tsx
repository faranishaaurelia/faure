"use client";

// Widget chat melayang yang dibind ke sebuah konteks (produk / pesanan).
// Dipakai di halaman detail produk dan detail pesanan.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/useI18n";
import { createClient } from "@/lib/supabase/client";
import {
  ensureConversation,
  markChatRead,
  sendChatMessage,
} from "@/lib/actions/chat";
import {
  KOLOM_MESSAGE,
  MAKS_PESAN,
  formatChatWaktu,
  type ChatContextType,
  type ChatMessage,
} from "@/lib/chat";

type Props = {
  contextType: ChatContextType;
  contextId: number;
  /** Nama produk atau kode pesanan — ditampilkan di header panel. */
  title: string;
  initialConversationId: number | null;
  initialMessages: ChatMessage[];
  isSignedIn: boolean;
  /** id user yang sedang login (untuk menentukan posisi gelembung pesan). */
  currentUserId: string | null;
};

export default function ChatWidget({
  contextType,
  contextId,
  title,
  initialConversationId,
  initialMessages,
  isSignedIn,
  currentUserId,
}: Props) {
  const { t, locale } = useI18n();
  const supabaseRef = useRef(createClient());

  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(
    initialConversationId,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [unread, setUnread] = useState(
    (initialMessages ?? []).filter(
      (m) => currentUserId && m.sender_id !== currentUserId && !m.is_read,
    ).length,
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const convIdRef = useRef(conversationId);
  const openRef = useRef(open);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    convIdRef.current = conversationId;
  }, [conversationId]);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // ---------- Ambil pesan terbaru ----------
  const refreshMessages = useCallback(async () => {
    const id = convIdRef.current;
    if (!id) return;

    const { data } = await supabaseRef.current
      .from("messages")
      .select(KOLOM_MESSAGE)
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (!data) return;

    const belumDibaca = (data as ChatMessage[]).filter(
      (m) =>
        currentUserIdRef.current &&
        m.sender_id !== currentUserIdRef.current &&
        !m.is_read,
    ).length;

    setMessages(data as ChatMessage[]);

    if (openRef.current) {
      // Panel terbuka → semua pesan dianggap sudah dibaca
      setUnread(0);
      if (belumDibaca > 0) markChatRead(id);
    } else {
      setUnread(belumDibaca);
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    const id = convIdRef.current;
    if (!id || !currentUserIdRef.current) return;

    const { count } = await supabaseRef.current
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", id)
      .neq("sender_id", currentUserIdRef.current)
      .eq("is_read", false);

    setUnread(count ?? 0);
  }, []);

  // ---------- Buka panel ----------
  async function handleOpen() {
    setError(null);
    setOpen(true);
    setUnread(0); // langsung hapus notif begitu panel dibuka

    if (convIdRef.current) {
      markChatRead(convIdRef.current); // tandai dibaca di server
      await refreshMessages();
    }
  }

  // ---------- Polling: pesan penuh saat terbuka, hitung unread saat tertutup ----------
  useEffect(() => {
    if (!isSignedIn || !conversationId) return;

    const jeda = open ? 8000 : 20000;
    const timer = setInterval(() => {
      if (openRef.current) refreshMessages();
      else refreshUnread();
    }, jeda);

    return () => clearInterval(timer);
  }, [isSignedIn, conversationId, open, refreshMessages, refreshUnread]);

  // ---------- Tutup panel dengan tombol Escape ----------
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ---------- Kirim pesan ----------
  async function handleSend() {
    const isi = input.trim();
    if (!isi || sending || creating) return;

    let id = convIdRef.current;

    // Jika thread belum ada, buat thread saat pertama kali user mengirim pesan
    if (!id) {
      setCreating(true);
      setError(null);
      const resEnsure = await ensureConversation(contextType, contextId);
      setCreating(false);

      if (resEnsure.error || !resEnsure.conversationId) {
        setError(resEnsure.error ?? t("chat.loadFail"));
        return;
      }

      id = resEnsure.conversationId;
      setConversationId(id);
    }

    setSending(true);
    setError(null);

    const res = await sendChatMessage(id, isi);

    setSending(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.message) {
      setMessages((prev) => [...prev, res.message as ChatMessage]);
    }
    setInput("");
  }

  // ---------- Auto scroll ke pesan terbaru ----------
  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  return (
    <>
      {/* ===== Gelembung / tombol buka ===== */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={t("chat.bubbleLabel")}
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E1C18] text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition hover:bg-[#3A362F] hover:scale-105"
        >
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#B3261E] px-1.5 text-[11px] font-bold text-white ring-2 ring-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      )}

      {/* ===== Panel chat ===== */}
      {open && (
        <div
          role="dialog"
          aria-label={t("chat.bubbleLabel")}
          className="fixed bottom-4 right-4 z-[100] flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
          style={{ height: "min(640px, calc(100dvh - 7rem))" }}
        >
          {/* Header */}
          <header className="flex items-center gap-3 bg-[#1E1C18] px-5 py-4 text-white">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#9A7B69] text-sm font-bold">
              F
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5">Faure</p>
              <p className="truncate text-xs text-white/60">
                {contextType === "product"
                  ? t("chat.headProduct", { name: title })
                  : t("chat.headOrder", { code: title })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("chat.close")}
              className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          {/* Isi */}
          {!isSignedIn ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F7F3EE] text-[#8B6B5A]">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3.5" y="11" width="17" height="10" rx="2" />
                  <path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" />
                </svg>
              </div>
              <p className="text-sm font-medium">{t("chat.loginTitle")}</p>
              <p className="text-xs leading-5 text-[#8B8478]">
                {t("chat.loginBody")}
              </p>
              <Link
                href="/login"
                className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-[#1E1C18] px-6 text-sm font-medium text-white transition hover:bg-[#35322B]"
              >
                {t("chat.loginAction")}
              </Link>
            </div>
          ) : creating ? (
            <div className="flex flex-1 items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#E7E5E0] border-t-[#1E1C18]" />
            </div>
          ) : (
            <>
              {/* Daftar pesan */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-[#F7F4F0] px-4 py-4">
                {messages.length === 0 && (
                  <div className="rounded-2xl bg-white px-4 py-6 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F3EE] text-[#9A7B69]">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[#4A463F]">
                      {contextType === "product"
                        ? t("chat.emptyProduct")
                        : t("chat.emptyOrder")}
                    </p>
                    <p className="mt-1 text-xs text-[#8B8478]">
                      {t("chat.responseHint")}
                    </p>
                  </div>
                )}

                {messages.map((m) => {
                  const milikSaya =
                    currentUserId != null && m.sender_id === currentUserId;

                  return (
                    <div
                      key={m.id}
                      className={`flex ${milikSaya ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          milikSaya ? "items-end" : "items-start"
                        }`}
                      >
                        {!milikSaya && (
                          <p className="mb-1 px-1 text-[10px] font-medium text-[#9A938B]">
                            {t("chat.faure")}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                            milikSaya
                              ? "rounded-br-md bg-[#1E1C18] text-white"
                              : "rounded-bl-md bg-white text-[#4A463F] shadow-sm"
                          }`}
                        >
                          {m.content}
                        </div>
                        <p className="mt-1 px-1 text-[10px] text-[#A9A29A]">
                          {formatChatWaktu(m.created_at, t, locale)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {error && (
                  <p className="rounded-xl bg-[#FCE8E6] px-4 py-3 text-xs text-[#B3261E]">
                    {error}
                  </p>
                )}

                <div ref={endRef} />
              </div>

              {/* Input */}
              <footer className="border-t border-[#EFEDE8] bg-white p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    maxLength={MAKS_PESAN}
                    placeholder={t("chat.placeholder")}
                    aria-label={t("chat.placeholder")}
                    className="max-h-28 min-h-[42px] flex-1 resize-none rounded-2xl border border-[#E0DAD2] bg-[#F7F4F0] px-4 py-2.5 text-sm text-[#1E1C18] placeholder:text-[#A9A29A] focus:border-[#1E1C18] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || creating || !input.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1E1C18] text-white transition hover:bg-[#35322B] disabled:opacity-40"
                    aria-label={t("chat.send")}
                  >
                    {sending ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M22 2L11 13" />
                        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </footer>
            </>
          )}
        </div>
      )}
    </>
  );
}
