"use client";

import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  ukuranSlot,
  type OutfitItemTampil,
} from "@/lib/outfit-helpers";

type OutfitPreviewProps = {
  items: OutfitItemTampil[];
  className?: string;
  fill?: boolean;
};

export default function OutfitPreview({
  items,
  className = "",
  fill = false,
}: OutfitPreviewProps) {
  const { t } = useI18n();

  return (
    <div
      className={`relative overflow-hidden bg-[#F3F0EC] ${fill ? "h-full w-full" : "aspect-[3/4]"} ${className}`}
      style={{ position: "relative", zIndex: 1, isolation: "isolate" }}
    >
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <p className="text-center text-xs text-[#8B8478]">
            {t("outfit.emptyPreview")}
          </p>
        </div>
      )}

      {items.map((item, index) => {
        const ukuran = ukuranSlot(item.slot);
        // Normalize zIndex so items layer properly locally without leaking large numbers
        const safeZIndex =
          typeof item.zIndex === "number"
            ? Math.max(1, Math.min(item.zIndex, 50))
            : index + 1;

        return (
          <div
            key={item.id}
            style={{
              left: `${item.posX}%`,
              top: `${item.posY}%`,
              width: `${ukuran.widthPercent}%`,
              height: `${ukuran.heightPercent}%`,
              zIndex: safeZIndex,
              transform: `scale(${item.scale})`,
              transformOrigin: "center center",
            }}
            className="absolute"
          >
            {item.gambar ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL storage eksternal
              <img
                src={item.gambar}
                alt={item.nama}
                className="h-full w-full object-contain drop-shadow-sm"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-[#C9C2B8]">
                {item.nama}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
