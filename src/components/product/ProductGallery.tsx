"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductGallery({
  images,
  productName,
}: ProductGalleryProps) {
  const { t } = useI18n();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeImage, setActiveImage] = useState(0);

  const total = images.length;

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;

    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveImage(index);
  }

  function goTo(index: number) {
    const el = scrollerRef.current;
    if (!el) return;

    const next = Math.max(0, Math.min(total - 1, index));

    el.scrollTo({
      left: next * el.clientWidth,
      behavior: "smooth",
    });

    setActiveImage(next);
  }

  if (total === 0) {
    return (
      <div className="flex min-h-[360px] w-full items-center justify-center rounded-2xl bg-[#F6F3EF]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/80">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>

          <p className="text-sm text-[#8B8478]">{t("product.noImage")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* MAIN GALLERY */}
      <div className="relative overflow-hidden rounded-2xl bg-[#F6F3EF]">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="
            flex
            h-[430px]
            w-full
            snap-x
            snap-mandatory
            overflow-x-auto
            overscroll-x-contain
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
            sm:h-[500px]
          "
        >
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="
                flex
                h-full
                w-full
                shrink-0
                snap-center
                items-center
                justify-center
                px-4
                sm:px-6
              "
            >
              <img
                src={image}
                alt={`${productName} ${index + 1}`}
                className="
                  max-h-full
                  max-w-full
                  object-contain
                  select-none
                "
                draggable={false}
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>

        {total > 1 && (
          <>
            {/* PANAH KIRI */}
            <button
              type="button"
              onClick={() => goTo(activeImage - 1)}
              disabled={activeImage === 0}
              aria-label={t("product.prevPhoto")}
              className="
                absolute
                left-3
                top-1/2
                hidden
                h-9
                w-9
                -translate-y-1/2
                items-center
                justify-center
                rounded-full
                bg-white/90
                text-[#1E1C18]
                shadow-sm
                backdrop-blur
                transition
                hover:bg-white
                disabled:pointer-events-none
                disabled:opacity-0
                sm:flex
              "
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m15 6-6 6 6 6" />
              </svg>
            </button>

            {/* PANAH KANAN */}
            <button
              type="button"
              onClick={() => goTo(activeImage + 1)}
              disabled={activeImage === total - 1}
              aria-label={t("product.nextPhoto")}
              className="
                absolute
                right-3
                top-1/2
                hidden
                h-9
                w-9
                -translate-y-1/2
                items-center
                justify-center
                rounded-full
                bg-white/90
                text-[#1E1C18]
                shadow-sm
                backdrop-blur
                transition
                hover:bg-white
                disabled:pointer-events-none
                disabled:opacity-0
                sm:flex
              "
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>

            {/* COUNTER */}
            <div
              className="
                absolute
                bottom-3
                right-3
                rounded-full
                bg-white/90
                px-2.5
                py-1
                text-[10px]
                text-[#5F5851]
                backdrop-blur
              "
            >
              {activeImage + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* THUMBNAILS */}
      {total > 1 && (
        <div
          className="
            mt-3
            flex
            gap-2
            overflow-x-auto
            pb-1
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => goTo(index)}
              aria-label={t("product.viewPhoto", { index: index + 1 })}
              className={`
                relative
                h-[58px]
                w-[48px]
                shrink-0
                overflow-hidden
                rounded-lg
                bg-[#F3F0EC]
                transition
                ${
                  activeImage === index
                    ? "ring-1 ring-[#8B6B5A] ring-offset-2"
                    : "opacity-55 hover:opacity-100"
                }
              `}
            >
              <img
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                className="h-full w-full object-contain"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
