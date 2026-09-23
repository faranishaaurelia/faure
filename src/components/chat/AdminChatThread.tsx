"use client";

// Panel balasan chat untuk admin. Polling tiap 8 detik + kirim optimistik.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markChatRead, sendChatMessage } from "@/lib/actions/chat";
import {
  KOLOM_MESSAGE,
  MAKS_PESAN,
  formatChatWaktu,
  type ChatMessage,
} from "@/lib/chat";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { translate } from "@/lib/i18n/translate";

const t = (key: string, vars?: Record<string, string | number>) =>
  translate(dictionaries.id, key, vars);

type Props = {
  conversationId: number;
  initialMessages: ChatMessage[];
  participantName: string;
  /** id admin yang sedang login — untuk menentukan sisi gelembung. */
  currentUserId: string;
};

export default function AdminChatThread({
  conversationId,
  initialMessages,
  participantName,
  currentUserId,
}: Props) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from("messages")
      .select(KOLOM_MESSAGE)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!data) return;

    setMessages(data as ChatMessage[]);

    // Pesan pelanggan dianggap sudah dibaca begitu admin membuka thread.
    const adaBelumDibaca = (data as ChatMessage[]).some(
      (m) => m.sender_id !== currentUserId && !m.is_read,
    );
    if (adaBelumDibaca) {
      await markChatRead(conversationId);
      router.refresh();
    }
  }, [conversationId, currentUserId, router]);

  // Polling pesan baru.
  useEffect(() => {
    // Tandai semua pesan sudah dibaca begitu thread dibuka.
    markChatRead(conversationId).then(() => {
      router.refresh();
    });
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, [refresh, conversationId, router]);

  // Auto scroll ke pesan terbaru.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function handleSend() {
    const isi = input.trim();
    if (!isi || sending) return;

    setSending(true);
    setError(null);

    const res = await sendChatMessage(conversationId, isi);

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

  const inisial = participantName.trim().charAt(0).toUpperCase() || "?";

  return (
    <section className="admin-card flex flex-col overflow-hidden">
      {/* Daftar pesan */}
      <div
        className="space-y-3 overflow-y-auto bg-[#F7F4F0] p-5"
        style={{ maxHeight: "min(560px, calc(100dvh - 330px))" }}
      >
        {messages.length === 0 && (
          <div className="rounded-2xl bg-white px-4 py-8 text-center">
            <p className="text-sm font-medium text-[#4A463F]">
              Belum ada pesan dari pelanggan.
            </p>
            <p className="mt-1 text-xs text-[#8B8478]">
              Tulis balasan untuk memulai percakapan.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const milikAdmin = m.sender_id === currentUserId;

          return (
            <div
              key={m.id}
              className={`flex ${milikAdmin ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[80%]">
                {!milikAdmin && (
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F0E9E2] text-[10px] font-semibold text-[#8B6B5A]">
                      {inisial}
                    </span>
                    <span className="text-[10px] font-medium text-[#9A938B]">
                      {participantName}
                    </span>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    milikAdmin
                      ? "rounded-br-md bg-[#1E1C18] text-white"
                      : "rounded-bl-md bg-white text-[#4A463F] shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
                <p className="mt-1 px-1 text-[10px] text-[#A9A29A]">
                  {formatChatWaktu(m.created_at, t, "id-ID")}
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
      <footer className="border-t border-[#EFEDE8] bg-white p-4">
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
            disabled={sending || !input.trim()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#1E1C18] px-5 text-sm font-medium text-white transition hover:bg-[#35322B] disabled:opacity-40"
          >
            {sending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              t("chat.send")
            )}
          </button>
        </div>
      </footer>
    </section>
  );
}