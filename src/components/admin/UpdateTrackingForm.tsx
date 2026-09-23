"use client";

import { useState } from "react";
import { updateOrderTracking } from "@/lib/actions/admin";

export default function UpdateTrackingForm({
  orderId,
  currentTracking,
}: {
  orderId: number;
  currentTracking: string | null;
}) {
  const [value, setValue] = useState(currentTracking ?? "");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setMessage(null);
    const result = await updateOrderTracking(orderId, value);
    setIsPending(false);
    setMessage(
      result.error ? `Gagal: ${result.error}` : "Nomor resi disimpan.",
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nomor resi"
        className="w-full h-[36px] border border-[#d5d5d5] rounded-lg px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#303030]"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full h-[36px] bg-[#303030] hover:bg-[#8b6b5a] text-white rounded-lg text-[13px] font-semibold transition disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Simpan Resi"}
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
