"use client";

import { useState, useTransition } from "react";
import { publishOutfit, unpublishOutfit } from "@/lib/actions/outfit";
import {
  OUTFIT_KATEGORI,
  type OutfitKategori,
} from "@/lib/outfit-helpers";
import { useI18n } from "@/lib/i18n";

export default function PublishOutfitForm({
  outfitId,
  isPublic,
  kategori,
}: {
  outfitId: number;
  isPublic: boolean;
  kategori: OutfitKategori | null;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string>(kategori ?? "");
  const [pesan, setPesan] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const getKategoriLabel = (cat: string) => {
    const key = cat.toLowerCase();
    const trans = t(`outfit.categories.${key}`);
    return trans || cat;
  };

  const publikasikan = () => {
    if (!selected) {
      setPesan(t("outfit.chooseTypeFirst"));
      return;
    }

    setPesan(null);
    startTransition(async () => {
      const result = await publishOutfit(outfitId, selected);
      if (result?.error) {
        setPesan(result.error);
        return;
      }
      setPesan(
        isPublic
          ? t("outfit.typeUpdated")
          : t("outfit.publishedOk"),
      );
    });
  };

  const batalkan = () => {
    const yakin = window.confirm(
      t("outfit.unpublishConfirm"),
    );
    if (!yakin) return;

    setPesan(null);
    startTransition(async () => {
      const result = await unpublishOutfit(outfitId);
      if (result?.error) {
        setPesan(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#1E1C18]">
          {t("outfit.publishTitle")}
        </p>
        <p className="mt-0.5 text-xs text-[#8B8478]">
          {t("outfit.publishBody")}
        </p>
      </div>

      {isPublic ? (
        <p className="rounded-full bg-[#F3F0EC] px-3 py-1.5 text-[11px] font-medium text-[#1E1C18]">
          {t("outfit.published")}
          {kategori ? ` · ${getKategoriLabel(kategori)}` : ""}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium text-[#746C64]">
          {t("outfit.type")}
        </span>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm text-[#1E1C18] outline-none transition focus:border-[#1E1C18]"
        >
          <option value="">{t("outfit.chooseType")}</option>
          {OUTFIT_KATEGORI.map((item) => (
            <option key={item} value={item}>
              {getKategoriLabel(item)}
            </option>
          ))}
        </select>
      </label>

      {pesan ? (
        <p className="text-xs text-[#8B6B5A]">{pesan}</p>
      ) : null}

      <button
        type="button"
        onClick={publikasikan}
        disabled={isPending}
        className="w-full rounded-full bg-[#1E1C18] py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending
          ? t("outfit.saving")
          : isPublic
            ? t("outfit.updatePublish")
            : t("outfit.publish")}
      </button>

      {isPublic ? (
        <button
          type="button"
          onClick={batalkan}
          disabled={isPending}
          className="w-full rounded-full border border-black/10 py-3 text-sm font-medium text-[#746C64] transition hover:bg-[#F8F6F2] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("outfit.unpublish")}
        </button>
      ) : null}
    </div>
  );
}
