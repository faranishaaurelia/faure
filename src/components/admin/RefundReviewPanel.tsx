"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewRefund } from "@/lib/actions/admin";
import { infoRefund } from "@/lib/orders";
import StatusBadge from "@/components/orders/StatusBadge";

type RefundRow = {
  id: number;
  order_id: number;
  reason: string | null;
  refund_amount: number | string | null;
  status: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
};

// Panel review pengajuan refund: setujui / tolak. Dipakai di halaman
// /admin/refunds dan di detail pesanan admin.
export default function RefundReviewPanel({
  refund,
  compact = false,
}: {
  refund: RefundRow;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const info = infoRefund(refund.status);
  const sudahDireview = info.key !== "menunggu" && info.key !== null;

  function tindak(approve: boolean) {
    const pesan = approve
      ? "Setujui pengembalian dana ini? Dana akan ditandai dikembalikan."
      : "Tolak pengajuan refund ini?";
    if (!window.confirm(pesan)) return;

    setError(null);
    startTransition(async () => {
      const result = await reviewRefund(refund.id, approve);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (compact) {
    if (sudahDireview) {
      return (
        <span className="inline-flex items-center gap-2">
          <StatusBadge label={info.label} tone={info.tone} />
          {error && <span className="text-[11px] text-[#B23B3B]">{error}</span>}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => tindak(true)}
          className="h-8 px-3 rounded-full bg-[#1E6B3A] text-white text-[12px] font-semibold hover:opacity-90 transition disabled:opacity-60"
        >
          {isPending ? "Menyimpan..." : "Setujui"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => tindak(false)}
          className="h-8 px-3 rounded-full border border-[#E2DFD9] bg-white text-[#B3261E] text-[12px] font-semibold hover:border-[#B3261E] transition disabled:opacity-60"
        >
          Tolak
        </button>
        {error && <span className="text-[11px] text-[#B23B3B]">{error}</span>}
      </span>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <StatusBadge label={info.label} tone={info.tone} />
        {info.key === "menunggu" && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => tindak(true)}
              className="h-9 px-4 rounded-full bg-[#1E6B3A] text-white text-[12px] font-semibold hover:opacity-90 transition disabled:opacity-60"
            >
              {isPending ? "Menyimpan..." : "Setujui Refund"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => tindak(false)}
              className="h-9 px-4 rounded-full border border-[#E2DFD9] bg-white text-[#B3261E] text-[12px] font-semibold hover:border-[#B3261E] transition disabled:opacity-60"
            >
              Tolak
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-[12px] text-[#B23B3B]">{error}</p>}

      {info.key === "disetujui" && (
        <p className="mt-3 rounded-xl bg-[#E6F4EA] px-4 py-3 text-[12px] text-[#1E6B3A]">
          Refund disetujui — dana ditandai dikembalikan.
        </p>
      )}
      {info.key === "ditolak" && (
        <p className="mt-3 rounded-xl bg-[#FCE8E6] px-4 py-3 text-[12px] text-[#B3261E]">
          Pengajuan ini ditolak.
        </p>
      )}
    </div>
  );
}