"use client";

import { useTransition, type MouseEvent } from "react";
import { unpublishOutfit } from "@/lib/actions/outfit";
import { useI18n } from "@/lib/i18n";

export default function UnpublishOutfitButton({
  outfitId,
}: {
  outfitId: number;
}) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();

  const batalkan = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const yakin = window.confirm(t("outfit.unpublishConfirm"));
    if (!yakin) return;

    startTransition(async () => {
      await unpublishOutfit(outfitId);
    });
  };

  return (
    <button
      type="button"
      onClick={batalkan}
      disabled={isPending}
      className="mt-1.5 text-[10px] font-medium text-[#9A938C] transition hover:text-[#1E1C18] disabled:opacity-40"
    >
      {isPending ? t("outfit.unpublishing") : t("outfit.unpublish")}
    </button>
  );
}