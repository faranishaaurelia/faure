"use client";

import { useState } from "react";
import { submitReview } from "@/lib/actions/reviews";
import { useI18n } from "@/lib/i18n";

// Label deskriptif rating (1..5) -> key dictionary.
const RATING_TKEY: Record<number, string> = {
  1: "review.ratingPoor",
  2: "review.ratingFair",
  3: "review.ratingGood",
  4: "review.ratingVeryGood",
  5: "review.ratingExcellent",
};

export default function ReviewForm({
  orderItemId,
  productName,
  variantLabel,
}: {
  orderItemId: number;
  productName: string;
  variantLabel?: string | null;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [memproses, setMemproses] = useState(false);
  const [pesan, setPesan] = useState<{ type: "sukses" | "gagal"; teks: string } | null>(
    null,
  );

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    if (memproses) return;

    if (rating < 1) {
      setPesan({ type: "gagal", teks: t("review.selectStarFirst") });
      return;
    }

    setMemproses(true);
    setPesan(null);

    const result = await submitReview({ orderItemId, rating, comment });

    setMemproses(false);

    if (result.error) {
      setPesan({ type: "gagal", teks: result.error });
      return;
    }

    setPesan({
      type: "sukses",
      teks: t("review.success"),
    });
    setRating(0);
    setComment("");
  }

  return (
    <form onSubmit={kirim} className="space-y-4">
      <div className="flex items-center gap-4">
        <p className="text-[12px] text-[#6B655A] shrink-0">
          {t("review.yourRating")}
        </p>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((bintang) => (
            <button
              key={bintang}
              type="button"
              aria-label={t("review.stars", { count: bintang })}
              onMouseEnter={() => setHover(bintang)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(bintang)}
              className={`text-2xl leading-none transition ${
                (hover || rating) >= bintang
                  ? "text-[#B18452]"
                  : "text-[#D8D1CA] hover:text-[#B18452]"
              }`}
            >
              ★
            </button>
          ))}
        </div>

        {rating > 0 && (
          <span className="text-[12px] text-[#8B8478]">
            {t(RATING_TKEY[rating])}
          </span>
        )}
      </div>

      <label className="block">
        <span className="text-[12px] text-[#6B655A] mb-1.5 block">
          {t("review.commentOptional")}
        </span>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("review.commentPlaceholder", {
            name: `${productName}${variantLabel ? ` (${variantLabel})` : ""}`,
          })}
          className="w-full rounded-xl border border-[#DDD8D2] bg-white px-4 py-3 text-[13px] text-[#1A1A1A] placeholder:text-[#B0A9A1] transition focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
        />
      </label>

      {pesan && (
        <p
          role="alert"
          className={`text-[12px] ${
            pesan.type === "sukses" ? "text-[#1E6B3A]" : "text-[#B3261E]"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <button
        type="submit"
        disabled={memproses}
        className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-[#1E1C18] text-white text-[12px] font-medium hover:bg-[#35322B] transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {memproses ? t("review.sending") : t("review.sendReview")}
      </button>
    </form>
  );
}