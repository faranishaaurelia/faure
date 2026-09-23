"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/useI18n";
import { requestRefund } from "@/lib/actions/orders";

// Tombol "Ajukan Pengembalian Dana" untuk pesanan yang sudah dibatalkan
// tapi sudah dibayar (mis. dibatalkan admin sehingga belum ada pengajuan).
export default function RefundRequestButton({ orderId }: { orderId: number }) {
  const { t } = useI18n();
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  async function handleClick() {
    if (isPending) return;

    if (!window.confirm(t("account.requestRefundConfirm"))) return;

    setIsPending(true);
    setError(null);
    setPesan(null);

    const result = await requestRefund(orderId);

    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPesan(t("account.refundRequested"));
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#1E1C18] text-white text-sm font-medium hover:bg-[#35322B] transition disabled:opacity-60"
      >
        {isPending ? t("account.cancelOrdering") : t("account.requestRefund")}
      </button>
      <p className="mt-2 text-xs text-[#8B8478]">
        {t("account.requestRefundHint")}
      </p>

      {pesan && (
        <p className="mt-3 rounded-xl bg-[#E6F4EA] px-4 py-3 text-xs text-[#1E6B3A]">
          {pesan}
        </p>
      )}
      {error && <p className="mt-3 text-xs text-[#B3261E]">{error}</p>}
    </div>
  );
}