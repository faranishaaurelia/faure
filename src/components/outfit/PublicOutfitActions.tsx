"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkoutOutfitBuyNow, savePublishedOutfit } from "@/lib/actions/outfit";
import { useI18n } from "@/lib/i18n";

export default function PublicOutfitActions({
  outfitId,
  variantIds,
  canSave,
  loggedIn,
}: {
  outfitId: number;
  variantIds: number[];
  canSave: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [isBuying, setIsBuying] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);

  const checkoutOutfit = async () => {
    if (isBuying) return;
    setPesan(null);

    if (!loggedIn) {
      router.push("/login");
      return;
    }

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
      `/checkout?from=/outfit/${outfitId}&items=${itemsParam}&mode=buynow`,
    );
  };

  const simpanOutfit = () => {
    if (!canSave) return;
    setPesan(null);
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    startSave(async () => {
      const result = await savePublishedOutfit(outfitId);
      if (result?.error) {
        setPesan(result.error);
        return;
      }
      if (result?.outfitId) {
        router.push(`/outfit-saya/${result.outfitId}`);
      }
    });
  };

  return (
    <div className="space-y-2">
      {pesan ? <p className="text-xs text-red-500">{pesan}</p> : null}

      <button
        type="button"
        onClick={checkoutOutfit}
        disabled={isBuying || variantIds.length === 0}
        className="w-full rounded-full bg-[#1E1C18] py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isBuying ? t("outfit.preparing") : t("outfit.buyThis")}
      </button>

      {canSave ? (
        <button
          type="button"
          onClick={simpanOutfit}
          disabled={isSaving}
          className="w-full rounded-full border border-black/10 py-3 text-sm font-medium text-[#1E1C18] transition hover:bg-[#F8F6F2] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? t("outfit.saving") : t("outfit.saveToProfile")}
        </button>
      ) : (
        <p className="pt-1 text-center text-[11px] text-[#8B8478]">
          {t("outfit.yoursHint")}
        </p>
      )}
    </div>
  );
}
