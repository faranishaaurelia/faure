"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkoutOutfitBuyNow, deleteOutfit } from "@/lib/actions/outfit";
import { useI18n } from "@/lib/i18n";

export default function OutfitDetailActions({
  outfitId,
  variantIds,
}: {
  outfitId: number;
  variantIds: number[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [isBuying, setIsBuying] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);

  const checkoutOutfit = async () => {
    if (isBuying) return;
    setPesan(null);

    if (variantIds.length === 0) {
      setPesan(t("outfit.noVariant"));
      return;
    }

    setIsBuying(true);
    const result = await checkoutOutfitBuyNow(variantIds);

    if (result?.error || !result?.items) {
      setPesan(result?.error ?? t("outfit.checkoutFail"));
      setIsBuying(false);
      return;
    }

    const itemsParam = result.items
      .map((i) => `${i.cartId}:${i.quantity}`)
      .join(",");

    router.push(
      `/checkout?from=/outfit-saya/${outfitId}&items=${itemsParam}&mode=buynow`,
    );
  };

  const hapusOutfit = () => {
    if (isDeleting) return;
    const yakin = window.confirm(t("outfit.deleteConfirm"));
    if (!yakin) return;

    setPesan(null);
    startDeleteTransition(async () => {
      const result = await deleteOutfit(outfitId);
      if (result?.error) {
        setPesan(result.error);
        return;
      }
      router.push("/outfit-saya");
    });
  };

  return (
    <div className="space-y-2">
      {pesan && <p className="text-xs text-red-500">{pesan}</p>}

      <button
        onClick={checkoutOutfit}
        disabled={isBuying || variantIds.length === 0}
        className="w-full rounded-full bg-[#1E1C18] py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isBuying ? t("outfit.preparing") : t("outfit.checkoutOutfit")}
      </button>

      <button
        onClick={hapusOutfit}
        disabled={isDeleting}
        className="w-full rounded-full border border-red-300 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isDeleting ? t("outfit.deleting") : t("outfit.delete")}
      </button>
    </div>
  );
}
