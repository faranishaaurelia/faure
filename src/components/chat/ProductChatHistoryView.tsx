"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/useI18n";
import { createClient } from "@/lib/supabase/client";
import { markChatRead, sendChatMessage } from "@/lib/actions/chat";
import {
  KOLOM_MESSAGE,
  MAKS_PESAN,
  formatChatWaktu,
  type ChatMessage,
} from "@/lib/chat";

export type ProductChatInfo = {
  id: number;
  name: string;
  base_price: number;
  categoryName: string | null;
  imageUrl: string | null;
};

export type ConversationItem = {
  id: number;
  context_id: number;
  context_type: string;
  created_at: string;
  last_message_at: string | null;
  product: ProductChatInfo | null;
  messages: ChatMessage[];
  unreadCount: number;
  lastMessage: ChatMessage | null;
};

type Props = {
  initialConversations: ConversationItem[];
  currentUserId: string;
  initialSelectedConvId?: number | null;
};

function formatRupiah(num: number): string {
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export default function ProductChatHistoryView({
  initialConversations,
  currentUserId,
  initialSelectedConvId,
}: Props) {
  const { t, locale } = useI18n();
  const supabaseRef = useRef(createClient());

  const [conversations, setConversations] =
    useState<ConversationItem[]>(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(() => {
    if (
      initialSelectedConvId &&
      initialConversations.some((c) => c.id === initialSelectedConvId)
    ) {
      return initialSelectedConvId;
    }
    return initialConversations[0]?.id ?? null;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(
    Boolean(initialSelectedConvId),
  );

  const endRef = useRef<HTMLDivElement | null>(null);
  const selectedConvIdRef = useRef(selectedConvId);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Percakapan aktif saat ini
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) ?? null;
  }, [conversations, selectedConvId]);

  // Filter daftar percakapan berdasarkan query search
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const productName = c.product?.name?.toLowerCase() ?? "";
      const categoryName = c.product?.categoryName?.toLowerCase() ?? "";
      const lastMsg = c.lastMessage?.content?.toLowerCase() ?? "";
      return (
        productName.includes(q) ||
        categoryName.includes(q) ||
        lastMsg.includes(q)
      );
    });
  }, [conversations, searchQuery]);

  // ---------- Polling / Refresh Pesan ----------
  const refreshActiveMessages = useCallback(async () => {
    const convId = selectedConvIdRef.current;
    if (!convId) return;

    const { data } = await supabaseRef.current
      .from("messages")
      .select(KOLOM_MESSAGE)
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (!data) return;

    const msgs = data as ChatMessage[];
    const unreadAdminMsgs = msgs.filter(
      (m) =>
        currentUserIdRef.current &&
        m.sender_id !== currentUserIdRef.current &&
        !m.is_read,
    ).length;

    if (unreadAdminMsgs > 0) {
      markChatRead(convId);
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            messages: msgs,
            lastMessage: msgs[msgs.length - 1] ?? null,
            unreadCount: 0,
          };
        }
        return c;
      }),
    );
  }, []);

  // Polling berkala tiap 7 detik
  useEffect(() => {
    if (!selectedConvId) return;

    // Tandai dibaca saat percakapan dipilih
    markChatRead(selectedConvId);

    const timer = setInterval(() => {
      refreshActiveMessages();
    }, 7000);

    return () => clearInterval(timer);
  }, [selectedConvId, refreshActiveMessages]);

  // Scroll otomatis ke bawah saat pesan berubah atau ganti thread
  useEffect(() => {
    if (activeConversation) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [activeConversation, selectedConvId]);

  // Handler pilih percakapan
  function handleSelectConversation(convId: number) {
    setSelectedConvId(convId);
    setMobileShowChat(true);
    setError(null);

    // Langsung hapus unread badge di UI dan kirim markChatRead
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)),
    );
    markChatRead(convId);
  }

  // Handler kirim pesan
  async function handleSend() {
    const isi = input.trim();
    const convId = selectedConvIdRef.current;
    if (!isi || sending || !convId) return;

    setSending(true);
    setError(null);

    const res = await sendChatMessage(convId, isi);
    setSending(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.message) {
      const newMsg = res.message as ChatMessage;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === convId) {
            const nextMessages = [...c.messages, newMsg];
            return {
              ...c,
              messages: nextMessages,
              lastMessage: newMsg,
              last_message_at: newMsg.created_at,
            };
          }
          return c;
        }),
      );
      setInput("");
    }
  }

  // Total pesan belum dibaca dari semua percakapan
  const totalUnreadAll = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-[24px] border border-black/5 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E1C18]">
              {t("account.chatTitle")}
            </h1>
            {totalUnreadAll > 0 && (
              <span className="inline-flex items-center rounded-full bg-[#B3261E] px-2.5 py-0.5 text-xs font-semibold text-white">
                {totalUnreadAll} {t("chat.justNow")}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#8B8478]">
            {t("account.chatBody")}
          </p>
        </div>

        <Link
          href="/produk"
          className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-full bg-[#1E1C18] px-5 py-2.5 text-xs font-medium text-white transition hover:bg-[#35322B]"
        >
          <span>+</span> {t("account.askProductAdmin")}
        </Link>
      </div>

      {/* Main Content Area */}
      {conversations.length === 0 ? (
        /* Empty State: Belum ada percakapan produk */
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-black/5 bg-white p-10 sm:p-16 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F4F0] text-[#9A7B69]">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#1E1C18]">
            {t("account.chatEmpty")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-[#8B8478]">
            {t("account.chatEmptyBody")}
          </p>
          <Link
            href="/produk"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#1E1C18] px-7 text-sm font-medium text-white transition hover:bg-[#35322B] shadow-sm"
          >
            {t("account.startShopping")}
          </Link>
        </div>
      ) : (
        /* Split-Pane Master-Detail View */
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr] overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm">
          {/* Kolom Kiri: Daftar Produk yang Pernah Dichat */}
          <div
            className={`flex flex-col border-r border-[#EFEDE8] bg-[#FAF9F7] ${
              mobileShowChat ? "hidden md:flex" : "flex"
            }`}
            style={{ height: "min(680px, calc(100dvh - 220px))" }}
          >
            {/* Search Box */}
            <div className="p-3.5 border-b border-[#EFEDE8] bg-white">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("account.searchProductChat")}
                  className="w-full rounded-xl border border-[#E7E5E0] bg-[#F7F5F2] py-2 pl-9 pr-3 text-xs text-[#1E1C18] placeholder:text-[#A9A29A] focus:border-[#1E1C18] focus:bg-white focus:outline-none transition"
                />
                <svg
                  className="absolute left-3 top-2.5 text-[#9A938B]"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-xs text-[#9A938B] hover:text-[#1E1C18]"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* List Percakapan */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#EFEDE8]/60 p-2 space-y-1">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8B8478]">
                  {t("account.noProductsFound")}
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isActive = c.id === selectedConvId;
                  const lastMsg = c.lastMessage;
                  const lastMsgText = lastMsg
                    ? lastMsg.content
                    : t("chat.emptyProduct");
                  const timeLabel = lastMsg
                    ? formatChatWaktu(lastMsg.created_at, t, locale)
                    : formatChatWaktu(c.created_at, t, locale);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectConversation(c.id)}
                      className={`w-full text-left rounded-2xl p-3 flex items-start gap-3 transition cursor-pointer ${
                        isActive
                          ? "bg-[#1E1C18] text-white shadow-sm"
                          : "hover:bg-white text-[#1E1C18]"
                      }`}
                    >
                      {/* Product Thumbnail */}
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#EBE7E1] border border-black/5">
                        {c.product?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.product.imageUrl}
                            alt={c.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8B6B5A]">
                            F
                          </div>
                        )}
                        {c.unreadCount > 0 && !isActive && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B3261E] px-1 text-[9px] font-bold text-white ring-2 ring-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Content Preview */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`truncate text-xs font-bold leading-tight ${
                              isActive ? "text-white" : "text-[#1E1C18]"
                            }`}
                          >
                            {c.product?.name ?? `Produk #${c.context_id}`}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] ${
                              isActive ? "text-white/60" : "text-[#A39B92]"
                            }`}
                          >
                            {timeLabel}
                          </span>
                        </div>

                        {c.product?.base_price ? (
                          <p
                            className={`text-[10px] mt-0.5 ${
                              isActive ? "text-white/75" : "text-[#8B6B5A] font-medium"
                            }`}
                          >
                            {formatRupiah(c.product.base_price)}
                          </p>
                        ) : null}

                        <p
                          className={`mt-1 line-clamp-1 text-[11px] leading-relaxed ${
                            isActive ? "text-white/80" : "text-[#6B655A]"
                          }`}
                        >
                          {lastMsg && lastMsg.sender_id === currentUserId && (
                            <span
                              className={
                                isActive ? "text-white/60" : "text-[#9A938B]"
                              }
                            >
                              {t("account.you")}:{" "}
                            </span>
                          )}
                          {lastMsgText}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Kolom Kanan: Detail Percakapan Produk Terpilih */}
          <div
            className={`flex flex-col bg-white ${
              !mobileShowChat ? "hidden md:flex" : "flex"
            }`}
            style={{ height: "min(680px, calc(100dvh - 220px))" }}
          >
            {activeConversation ? (
              <>
                {/* Header Chat Detail */}
                <header className="flex items-center justify-between gap-3 border-b border-[#EFEDE8] bg-white px-4 py-3.5 sm:px-6">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Tombol Back di Mobile */}
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3EFE9] text-[#1E1C18] hover:bg-[#E5DFD7] transition"
                      aria-label={t("account.backToProductList")}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>

                    {/* Thumbnail & Info Produk */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-[#F7F4F0]">
                      {activeConversation.product?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeConversation.product.imageUrl}
                          alt={activeConversation.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8B6B5A]">
                          F
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-bold text-[#1E1C18]">
                          {activeConversation.product?.name ??
                            `Produk #${activeConversation.context_id}`}
                        </h2>
                        {activeConversation.product?.categoryName && (
                          <span className="hidden sm:inline-block rounded-full bg-[#F3EFE9] px-2 py-0.5 text-[10px] font-medium text-[#8B6B5A]">
                            {activeConversation.product.categoryName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {activeConversation.product?.base_price ? (
                          <p className="text-xs font-semibold text-[#8B6B5A]">
                            {formatRupiah(activeConversation.product.base_price)}
                          </p>
                        ) : null}
                        <span className="text-[11px] text-[#A39B92]">
                          • {t("account.adminFaure")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Lihat Produk */}
                  {activeConversation.product ? (
                    <Link
                      href={`/produk/${activeConversation.product.id}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E0DAD2] bg-[#FAF8F5] px-3 py-1.5 text-xs font-medium text-[#1E1C18] transition hover:bg-[#1E1C18] hover:text-white"
                      title={t("account.viewProductDetail")}
                    >
                      <span>{t("account.viewProductDetail")}</span>
                      <span aria-hidden>→</span>
                    </Link>
                  ) : null}
                </header>

                {/* Message Stream Area */}
                <div className="flex-1 space-y-3.5 overflow-y-auto bg-[#F7F4F0] p-4 sm:p-5">
                  {activeConversation.messages.length === 0 ? (
                    <div className="my-auto rounded-2xl bg-white px-5 py-8 text-center shadow-sm">
                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F3EE] text-[#9A7B69]">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-[#1E1C18]">
                        {t("chat.emptyProduct")}
                      </p>
                      <p className="mt-1 text-xs text-[#8B8478] max-w-sm mx-auto">
                        {t("chat.responseHint")}
                      </p>
                    </div>
                  ) : null}

                  {activeConversation.messages.map((m) => {
                    const isMine = m.sender_id === currentUserId;

                    return (
                      <div
                        key={m.id}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] ${
                            isMine ? "items-end" : "items-start"
                          }`}
                        >
                          {!isMine && (
                            <div className="mb-1 flex items-center gap-1.5 px-1">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#9A7B69] text-[9px] font-bold text-white">
                                F
                              </span>
                              <span className="text-[10px] font-semibold text-[#8B6B5A]">
                                {t("account.adminFaure")}
                              </span>
                            </div>
                          )}

                          <div
                            className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                              isMine
                                ? "rounded-br-sm bg-[#1E1C18] text-white shadow-sm"
                                : "rounded-bl-sm bg-white text-[#2C2925] shadow-sm border border-black/5"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {m.content}
                            </p>
                          </div>

                          <p
                            className={`mt-1 px-1 text-[10px] text-[#A9A29A] ${
                              isMine ? "text-right" : "text-left"
                            }`}
                          >
                            {formatChatWaktu(m.created_at, t, locale)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {error && (
                    <p className="rounded-xl bg-[#FCE8E6] p-3 text-xs text-[#B3261E]">
                      {error}
                    </p>
                  )}

                  <div ref={endRef} />
                </div>

                {/* Input Area */}
                <footer className="border-t border-[#EFEDE8] bg-white p-3 sm:p-4">
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
                      className="max-h-28 min-h-[42px] flex-1 resize-none rounded-2xl border border-[#E0DAD2] bg-[#F7F4F0] px-4 py-2.5 text-xs sm:text-sm text-[#1E1C18] placeholder:text-[#A9A29A] focus:border-[#1E1C18] focus:bg-white focus:outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !input.trim() || !selectedConvId}
                      className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-[#1E1C18] px-4 text-xs font-semibold text-white transition hover:bg-[#35322B] disabled:opacity-40"
                      aria-label={t("chat.send")}
                    >
                      {sending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <>
                          <span className="hidden sm:inline">
                            {t("chat.send")}
                          </span>
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 2L11 13" />
                            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </footer>
              </>
            ) : (
              /* State saat belum ada percakapan yang dipilih */
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[#8B8478]">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F7F4F0] text-[#B7AEA3]">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-medium text-[#1E1C18]">
                  {t("account.selectProductToChat")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
