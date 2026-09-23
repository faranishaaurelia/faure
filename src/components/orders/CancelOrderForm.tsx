"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/useI18n";
import { cancelOrder } from "@/lib/actions/orders";

// Formulir pembatalan pesanan dari sisi user. Alasan wajib diisi dan
// disimpan ke orders.cancellation_reason supaya admin bisa melihatnya.
export default function CancelOrderForm({ orderId }: { orderId: number }) {
  const { t } = useI18n();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const alasanCepat = [
    "account.quickReason1",
    "account.quickReason2",
    "account.quickReason3",
    "account.quickReason4",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;

    const alasanFinal = reason.trim();
    if (alasanFinal.length < 2) {
      setError(t("errors.cancelReasonRequired"));
      return;
    }

    if (!window.confirm(t("account.cancelOrderConfirm"))) return;

    setIsPending(true);
    setError(null);

    const result = await cancelOrder(orderId, alasanFinal);

    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPesan(result.note ?? t("account.cancelOrderSuccess"));
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-[#E2DFD9] text-[#8A2530] text-sm font-medium hover:border-[#B3261E] hover:bg-[#FCE8E6] transition"
        >
          {t("account.cancelOrder")}
        </button>
        <p className="mt-2 text-xs text-[#8B8478]">
          {t("account.cancelOrderHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#F0D9D5] bg-[#FDF6F5] p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm font-medium text-[#1E1C18]">
            {t("account.cancelReasonLabel")}
          </p>
          <p className="mt-1 text-xs text-[#8B8478]">
            {t("account.cancelOrderHint")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {alasanCepat.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setReason(t(key))}
              className={`h-8 px-3 rounded-full text-xs border transition ${
                reason === t(key)
                  ? "bg-[#1E1C18] text-white border-[#1E1C18]"
                  : "bg-white border-[#E2DFD9] text-[#6B655A] hover:border-[#1E1C18]"
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("account.cancelReasonPlaceholder")}
          rows={3}
          required
          className="w-full rounded-xl border border-[#E2DFD9] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#1E1C18]"
        />

        {error && <p className="text-xs text-[#B3261E]">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#B3261E] text-white text-sm font-medium hover:bg-[#8A2530] transition disabled:opacity-60"
          >
            {isPending ? t("account.cancelOrdering") : t("account.cancelOrderSubmit")}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="inline-flex items-center justify-center h-10 px-5 rounded-full border border-[#E2DFD9] bg-white text-sm text-[#6B655A] hover:border-[#1E1C18] transition disabled:opacity-60"
          >
            {t("account.cancelOrderCancel")}
          </button>
        </div>
      </form>

      {pesan && (
        <p className="mt-3 rounded-xl bg-[#E6F4EA] px-4 py-3 text-xs text-[#1E6B3A]">
          {pesan}
        </p>
      )}
    </div>
  );
}