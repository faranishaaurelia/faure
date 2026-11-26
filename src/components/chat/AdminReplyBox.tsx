"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendChatMessage } from "@/lib/actions/chat";
import { MAKS_PESAN } from "@/lib/chat";

// Kotak balasan admin di halaman /admin/chat?room=...
// Setelah kirim, halaman dimuat ulang supaya pesan baru muncul di daftar.
// Halaman juga dimuat ulang tiap 10 detik supaya pesan baru dari pelanggan
// ikut tampil tanpa reload manual.
export default function AdminReplyBox({
  conversationId,
}: {
  conversationId: number;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(timer);
  }, [router]);

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

    setInput("");
    router.refresh();
  }

  return (
    <div>
      {error && (
        <p className="mb-2 rounded-xl bg-[#FCE8E6] px-4 py-2.5 text-xs text-[#B3261E]">
          {error}
        </p>
      )}
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
          placeholder="Tulis balasan…"
          aria-label="Tulis balasan"
          className="max-h-28 min-h-[42px] flex-1 resize-none rounded-2xl border border-[#E0DAD2] bg-[#F7F4F0] px-4 py-2.5 text-sm text-[#1E1C18] placeholder:text-[#A9A29A] focus:border-[#1E1C18] focus:bg-white focus:outline-none transition"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#1E1C18] px-5 text-sm font-medium text-white transition hover:bg-[#35322B] disabled:opacity-40"
        >
          {sending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            "Kirim"
          )}
        </button>
      </div>
    </div>
  );
}
