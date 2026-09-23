import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT, dateLocale } from "@/lib/i18n/server";
import OutfitPreview from "@/components/outfit/OutfitPreview";
import UnpublishOutfitButton from "@/components/outfit/UnpublishOutfitButton";
import {
  SELECT_OUTFIT_ITEMS,
  formatTanggalOutfit,
  kategoriDariCover,
  resolveOutfitItem,
  type OutfitItemRow,
} from "@/lib/outfit-helpers";

type BarisOutfit = {
  id: number;
  name: string | null;
  created_at: string;
  is_public: boolean | null;
  cover_image_url: string | null;
  outfit_items: OutfitItemRow[] | null;
};

export default async function OutfitSayaPage() {
  const { t, locale } = await getT();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("outfits")
    .select(`id, name, created_at, is_public, cover_image_url, outfit_items ( ${SELECT_OUTFIT_ITEMS} )`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal fetch outfit:", error.message);
  }

  const daftarOutfit = (data ?? []) as unknown as BarisOutfit[];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-[#2B2B2B] md:text-3xl">
            {t("outfit.myOutfits")}
          </h1>
          <p className="text-sm text-[#8B8478]">
            {t("outfit.myOutfitsBody")}
          </p>
        </div>

        <Link
          href="/outfit/buat"
          className="inline-flex items-center gap-2 rounded-full bg-[#1E1C18] px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
        >
          {t("outfit.createNew")}
        </Link>
      </div>

      {daftarOutfit.length === 0 ? (
        <div className="rounded-[24px] border border-black/5 bg-white py-20 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#EBEBEB] text-[#8B6B5A]">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16.5 4 12 7.2 7.5 4 3.5 6.8 6.2 9.2V20.2c0 .4.4.8.8.8h10c.4 0 .8-.4.8-.8V9.2l2.7-2.4L16.5 4Z" />
              <path d="M9.2 21V10.4c0-1.4 1.2-2.4 2.8-2.4s2.8 1 2.8 2.4V21" />
            </svg>
          </div>
          <p className="mb-2 font-semibold text-[#1E1C18]">
            {t("outfit.noneSaved")}
          </p>
          <p className="mx-auto mb-6 max-w-sm text-sm text-[#8B8478]">
            {t("outfit.noneSavedBody")}
          </p>
          <Link
            href="/outfit/buat"
            className="inline-flex items-center gap-2 rounded-full bg-[#1E1C18] px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
          >
            {t("outfit.firstOutfit")}
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-5 text-sm text-[#656058]">
            <span className="font-semibold text-[#1E1C18]">
              {daftarOutfit.length}
            </span>{" "}
            {t("outfit.savedCount")}
          </p>

          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
            {daftarOutfit.map((outfit) => {
              const items = (outfit.outfit_items ?? []).map(resolveOutfitItem);
              const kategori = kategoriDariCover(outfit.cover_image_url);

              return (
                <article key={outfit.id} className="group">
                  <Link
                    href={`/outfit-saya/${outfit.id}`}
                    className="block"
                    aria-label={t("outfit.openOutfit", {
                      name: outfit.name || t("outfit.untitled"),
                    })}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[#F3F0EB]">
                      <OutfitPreview items={items} fill />
                      {outfit.is_public ? (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-[#8B6B5A]">
                          {t("outfit.public")}
                        </span>
                      ) : null}
                    </div>

                    <div className="pt-2">
                      <h3 className="truncate text-[11px] font-medium leading-snug text-[#1A1A1A]">
                        {outfit.name || t("outfit.untitled")}
                      </h3>
                      <p className="mt-0.5 truncate text-[10px] leading-snug text-[#9A938C]">
                        {t("outfit.itemCount", { count: items.length })}
                        {kategori ? ` · ${kategori}` : ""} ·{" "}
                        {formatTanggalOutfit(outfit.created_at, dateLocale(locale))}
                      </p>
                    </div>
                  </Link>
                  {outfit.is_public ? (
                    <UnpublishOutfitButton outfitId={outfit.id} />
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
