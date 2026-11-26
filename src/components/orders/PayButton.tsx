"use client";
// src/components/orders/PayButton.tsx
// Tombol "Bayar sekarang" untuk pesanan yang masih menunggu pembayaran.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bayarDenganSnap } from "@/lib/snap-client";

export default function PayButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function bayar() {
    setLoading(true);
    setError("");
    const hasil = await bayarDenganSnap(orderId);
    if (hasil.status === "error" && hasil.error) setError(hasil.error);
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={bayar}
        disabled={loading}
        className="h-11 px-6 rounded-full bg-[#1A1A1A] text-white text-xs font-medium hover:bg-[#302D2A] transition disabled:opacity-60 cursor-pointer"
      >
        {loading ? "Membuka pembayaran..." : "Bayar sekarang"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-[#B3261E]">
          {error}
        </p>
      )}
    </div>
  );
}
