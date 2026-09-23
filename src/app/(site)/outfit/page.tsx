import Link from "next/link";
import OutfitPreview from "@/components/outfit/OutfitPreview";
import {
  OUTFIT_KATEGORI,
  handlePengguna,
  isOutfitKategori,
  ringkasanItemOutfit,
} from "@/lib/outfit-helpers";
import {
  FALLBACK_OUTFIT_NAME,
  FALLBACK_PEMBUAT,
  getPublicOutfits,
  type OutfitPublik,
} from "@/lib/outfit-public";
import { getT } from "@/lib/i18n/server";

const filterKategori = ["Semua", ...OUTFIT_KATEGORI];

function OutfitCard({
  item,
  displayName,
  displayHandle,
  viewDetailLabel,
}: {
  item: OutfitPublik;
  displayName: string;
  displayHandle: string;
  viewDetailLabel: string;
}) {
  return (
    <article className="group">
      <Link
        href={`/outfit/${item.id}`}
        className="block"
        aria-label={viewDetailLabel}
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[#F3F0EB]">
          <OutfitPreview items={item.items} fill />
        </div>
      </Link>

      <div className="pt-2">
        <h3 className="truncate text-[11px] font-medium leading-snug text-[#1A1A1A]">
          {displayName}
        </h3>
        <p className="mt-0.5 truncate text-[10px] leading-snug text-[#9A938C]">
          {ringkasanItemOutfit(item.items)} · @{displayHandle}
        </p>
      </div>
    </article>
  );
}

export default async function OutfitPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const { t } = await getT();
  const kategoriAktif =
    kategori && isOutfitKategori(kategori) ? kategori : "Semua";

  const semuaOutfit = await getPublicOutfits();
  const daftarOutfit =
    kategoriAktif === "Semua"
      ? semuaOutfit
      : semuaOutfit.filter((item) => item.kategori === kategoriAktif);

  const translateKategoriLabel = (cat: string) => {
    if (cat === "Semua") return t("outfit.all");
    const key = cat.toLowerCase();
    const trans = t(`outfit.categories.${key}`);
    return trans || cat;
  };

  const emptyKind =
    kategoriAktif === "Semua"
      ? t("outfit.publicKind")
      : translateKategoriLabel(kategoriAktif).toLowerCase();

  return (
    <main className="bg-white text-[#252525]">
      <section className="bg-[#FBF8F4] overflow-hidden">
        <div className="site-container">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 pt-24 md:pt-28 pb-10 md:pb-12">
            <div>
              <p className="text-[10px] md:text-xs uppercase tracking-[0.28em] text-[#A18B79]">
                {t("outfit.eyebrow")}
              </p>

              <h1 className="mt-4 font-serif text-[42px] md:text-[54px] lg:text-[60px] leading-[1.02] font-medium">
                {t("outfit.title1")}
                <br />
                <span className="text-[#B7A28F]">{t("outfit.title2")}</span>
              </h1>
            </div>

            <div className="flex items-end">
              <p className="max-w-[470px] text-sm md:text-[15px] leading-7 text-[#77716B]">
                {t("outfit.intro")}
              </p>
            </div>
          </div>

          <div className="relative -mx-6 md:-mx-10 lg:-mx-12">
            <div className="flex items-end justify-center gap-2 md:gap-3 h-[210px] md:h-[280px] overflow-hidden">
              <div className="shrink-0 w-[150px] md:w-[230px] h-[150px] md:h-[205px] rounded-md overflow-hidden bg-[#E2DDD7]">
                <img
                  src="/images/outfit-1.jpg"
                  alt="Outfit Casual Everyday"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="shrink-0 w-[180px] md:w-[260px] h-[175px] md:h-[235px] rounded-md overflow-hidden bg-[#E2DDD7]">
                <img
                  src="/images/outfit-2.jpg"
                  alt="Outfit Simple Weekend"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="shrink-0 w-[200px] md:w-[280px] h-[195px] md:h-[260px] rounded-md overflow-hidden bg-[#DDD7D0]">
                <img
                  src="/images/outfit-3.jpg"
                  alt="Outfit Relaxed Style"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="shrink-0 w-[180px] md:w-[260px] h-[175px] md:h-[235px] rounded-md overflow-hidden bg-[#E2DDD7]">
                <img
                  src="/images/outfit-4.jpg"
                  alt="Outfit Daily Minimal"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="shrink-0 w-[150px] md:w-[230px] h-[150px] md:h-[205px] rounded-md overflow-hidden bg-[#E2DDD7]">
                <img
                  src="/images/outfit-5.jpg"
                  alt="Outfit Soft Look"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-8 pb-9 md:pb-11">
            <Link
              href="/outfit/buat"
              className="group inline-flex items-center gap-4
              bg-[#A38D78] hover:bg-[#8F7864]
              text-white
              px-7 py-3.5
              rounded-md
              text-[11px] md:text-xs
              uppercase tracking-[0.08em]
              transition duration-300"
            >
              <span>{t("outfit.createNow")}</span>

              <span className="text-base transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="site-container">
          <div className="text-center mb-9 md:mb-11">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.28em] text-[#A18B79] mb-3">
              {t("outfit.sectionEyebrow")}
            </p>

            <h2 className="font-serif text-[32px] md:text-[40px] text-[#252525]">
              {t("outfit.sectionTitle")}
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10 md:mb-12">
            {filterKategori.map((item) => {
              const aktif = item === kategoriAktif;
              const href =
                item === "Semua" ? "/outfit" : `/outfit?kategori=${item}`;

              return (
                <Link
                  key={item}
                  href={href}
                  className={`px-5 py-2.5 rounded-full text-[10px] md:text-xs tracking-wide transition ${
                    aktif
                      ? "bg-[#252525] text-white"
                      : "border border-[#D8D0C8] text-[#77716B] hover:bg-[#F7F1E9]"
                  }`}
                >
                  {translateKategoriLabel(item)}
                </Link>
              );
            })}
          </div>

          {daftarOutfit.length === 0 ? (
            <div className="rounded-[24px] border border-black/5 bg-[#FBF8F4] py-16 text-center">
              <p className="font-medium text-[#1E1C18]">
                {t("outfit.emptyTitle", { kind: emptyKind })}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#8B8478]">
                {t("outfit.emptyBody")}
              </p>
              <Link
                href="/outfit/buat"
                className="mt-6 inline-flex rounded-full bg-[#1E1C18] px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
              >
                {t("outfit.create")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4 md:grid-cols-5 md:gap-x-3 md:gap-y-6 lg:grid-cols-6">
              {daftarOutfit.map((item) => {
                const displayName =
                  item.name === FALLBACK_OUTFIT_NAME
                    ? t("outfit.untitled")
                    : item.name;
                const displayCreator =
                  item.pembuatNama === FALLBACK_PEMBUAT
                    ? t("account.faureUser")
                    : item.pembuatNama;

                return (
                  <OutfitCard
                    key={item.id}
                    item={item}
                    displayName={displayName}
                    displayHandle={handlePengguna(displayCreator)}
                    viewDetailLabel={t("product.viewDetailOf", {
                      name: displayName,
                    })}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
