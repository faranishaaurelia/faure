"use client";

import { useState } from "react";
import { updateOrderStatus } from "@/lib/actions/admin";
import { infoStatus } from "@/lib/orders";

export default function UpdateStatusForm({
  orderId,
  currentStatus,
  options,
}: {
  orderId: number;
  currentStatus: string;
  options: { key: string; label: string }[];
}) {
  // Nilai di DB bisa "pending", sedangkan opsi memakai kunci tampilan
  // "menunggu_pembayaran". infoStatus menyamakan keduanya.
  const kanonik = infoStatus(currentStatus).key ?? currentStatus;
  const matched =
    options.find((opt) => opt.key === kanonik)?.key ?? kanonik;
  const [status, setStatus] = useState(matched);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setMessage(null);

    const result = await updateOrderStatus(orderId, status);

    setIsPending(false);
    setMessage(
      result.error ? `Gagal: ${result.error}` : "Status berhasil diperbarui.",
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full h-[36px] border border-[#d5d5d5] rounded-lg px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#303030]"
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-[36px] bg-[#303030] hover:bg-[#8b6b5a] text-white rounded-lg text-[13px] font-semibold transition disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Simpan Status"}
      </button>

      {message && (
        <p
          className={`text-[12px] ${message.startsWith("Gagal") ? "text-[#B23B3B]" : "text-[#1E6B3A]"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
