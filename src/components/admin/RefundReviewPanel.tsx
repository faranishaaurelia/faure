"use client";
// src/components/admin/RefundReviewPanel.tsx

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveRefund, rejectRefund } from "@/lib/actions/refunds";
import { infoRefund } from "@/lib/orders";

type Refund = {
  id: number;
  order_id: number;
  reason: string | null;
  refund_amount: number | string | null;
  status: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
};

export default function RefundReviewPanel({
  refund,
  compact = false,
}: {
  refund: Refund;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pesan, setPesan] = useState<{ teks: string; error: boolean } | null>(
    null,
  );
  const [bisaManual, setBisaManual] = useState(false);

  // Hanya pengajuan yang menunggu yang bisa ditinjau
  if (infoRefund(refund.status).key !== "menunggu") return null;

  const btn = `rounded-full font-medium transition disabled:opacity-60 cursor-pointer ${
    compact ? "h-8 px-3 text-[11px]" : "h-9 px-4 text-[12px]"
  }`;

  function jalankan(
    aksi: () => Promise<{
      error: string | null;
      note?: string;
      canManual?: boolean;
    }>,
  ) {
    setPesan(null);
    start(async () => {
      const hasil = await aksi();
      if (hasil.error) {
        setPesan({ teks: hasil.error, error: true });
        setBisaManual(Boolean(hasil.canManual));
      } else {
        setBisaManual(false);
        setPesan({ teks: hasil.note ?? "Berhasil.", error: false });
        router.refresh();
      }
    });
  }

  return (
    <div
      className={
        compact ? "inline-flex flex-col items-end gap-1.5" : "space-y-2"
      }
    >
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              confirm("Setujui refund? Dana akan dikembalikan lewat Midtrans.")
            ) {
              jalankan(() => approveRefund(refund.id));
            }
          }}
          className={`${btn} bg-[#1E1C18] text-white hover:bg-[#3A3630]`}
        >
          {pending ? "Memproses..." : "Setujui"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Tolak pengajuan refund ini?")) {
              jalankan(() => rejectRefund(refund.id));
            }
          }}
          className={`${btn} border border-[#D9D3CB] text-[#5C554D] hover:bg-[#F7F3EE]`}
        >
          Tolak
        </button>
      </div>

      {bisaManual && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                "Pastikan dana sudah kamu kembalikan ke pelanggan secara manual. Lanjutkan?",
              )
            ) {
              jalankan(() => approveRefund(refund.id, true));
            }
          }}
          className={`${btn} border border-[#B3261E] text-[#B3261E] hover:bg-[#FCE8E6]`}
        >
          Tandai sudah dikembalikan manual
        </button>
      )}

      {pesan && (
        <p
          role={pesan.error ? "alert" : "status"}
          className={`max-w-[260px] text-right text-[11px] leading-4 ${
            pesan.error ? "text-[#B3261E]" : "text-[#2E7D32]"
          }`}
        >
          {pesan.teks}
        </p>
      )}
    </div>
  );
}
