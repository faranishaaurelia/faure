import Link from "next/link";
import { notFound } from "next/navigation";
import OutfitPreview from "@/components/outfit/OutfitPreview";
import PublicOutfitActions from "@/components/outfit/PublicOutfitActions";
import { createClient } from "@/lib/supabase/server";
import {
  formatTanggalOutfit,
  handlePengguna,
  rupiahOutfit,
} from "@/lib/outfit-helpers";
import {
  FALLBACK_OUTFIT_NAME,
  FALLBACK_PEMBUAT,
  getPublicOutfitById,
} from "@/lib/outfit-public";
import { getT, dateLocale } from "@/lib/i18n/server";

export default async function OutfitPublikDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outfitId = Number(id);

  if (!Number.isInteger(outfitId) || outfitId <= 0) {
    notFound();
  }

  const outfit = await getPublicOutfitById(outfitId);
  if (!outfit) {
    notFound();
  }

  const { t, locale } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = outfit.items;
  const variantIds = items
    .map((i) => i.variantId)
    .filter((v): v is number => v !== null);
  const totalHarga = items.reduce((sum, item) => sum + (item.basePrice ?? 0), 0);
  const milikSendiri = user?.id === outfit.userId;

  // Fallback bawaan dari lib/outfit-public diganti dengan terjemahan
  // sesuai locale aktif (id/en).
  const displayName =
    outfit.name === FALLBACK_OUTFIT_NAME
      ? t("outfit.untitled")
      : outfit.name;
  const displayCreator =
    outfit.pembuatNama === FALLBACK_PEMBUAT
      ? t("account.faureUser")
      : outfit.pembuatNama;

  const getSlotLabel = (slot: string) => {
    switch (slot) {
      case "atasan":
        return t("outfit.slotTop");
      case "bawahan":
        return t("outfit.slotBottom");
      case "outer":
        return t("outfit.slotOuter");
      default:
        return t("outfit.slotOther");
    }
  };

  const getKategoriDisplay = (cat: string | null) => {
    if (!cat) return t("outfit.publicOutfit");
    const key = cat.toLowerCase();
    const trans = t(`outfit.categories.${key}`);
    return trans || cat;
  };

  return (
    <main className="bg-[#F8F8F8] text-[#1E1C18] min-h-screen pt-28 pb-20">
      <div className="site-container max-w-5xl">
        <Link
          href="/outfit"
          className="mb-6 inline-flex items-center gap-2 text-[13px] text-[#746C64] transition-colors hover:text-[#1E1C18]"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M12 4L6 10L12 16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t("outfit.back")}
        </Link>

        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#A18B79]">
            {getKategoriDisplay(outfit.kategori)}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#2B2B2B] md:text-3xl">
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-[#8B8478]">
            {t("outfit.createdBy", {
              name: displayCreator,
              handle: handlePengguna(displayCreator),
              date: formatTanggalOutfit(outfit.created_at, dateLocale(locale)),
              count: items.length,
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white p-4 shadow-sm">
            <OutfitPreview items={items} className="rounded-2xl" />
          </div>

          <aside className="space-y-5">
            <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1E1C18]">
                    {t("outfit.selectedProducts")}
                  </p>
                  <p className="mt-0.5 text-xs text-[#8B8478]">
                    {t("outfit.openProductHint")}
                  </p>
                </div>
                <p className="text-xs text-[#8B8478]">
                  {t("outfit.itemCount", { count: items.length })}
                </p>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-[#8B8478]">
                  {t("outfit.noProducts")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => {
                    const meta = [
                      getSlotLabel(item.slot),
                      item.ukuran
                        ? t("product.sizeWith", { size: item.ukuran })
                        : null,
                      item.warna,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    const isi = (
                      <>
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F3F0EC]">
                          {item.gambar ? (
                            // eslint-disable-next-line @next/next/no-img-element -- URL storage eksternal
                            <img
                              src={item.gambar}
                              alt={item.nama}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#1A1A1A] group-hover:underline">
                            {item.nama}
                          </p>
                          {meta ? (
                            <p className="mt-0.5 truncate text-[11px] text-[#8B8478]">
                              {meta}
                            </p>
                          ) : null}
                          {item.basePrice != null ? (
                            <p className="mt-1 text-xs font-medium text-[#1E1C18]">
                              {rupiahOutfit(item.basePrice)}
                            </p>
                          ) : null}
                          {item.productId ? (
                            <p className="mt-1 text-[11px] font-medium text-[#8B6B5A]">
                              {t("outfit.seeProduct")}
                            </p>
                          ) : null}
                        </div>
                      </>
                    );

                    return (
                      <li key={item.id}>
                        {item.productId ? (
                          <Link
                            href={`/produk/${item.productId}`}
                            className="group flex items-center gap-3 rounded-2xl border border-transparent p-1.5 transition hover:border-black/5 hover:bg-[#F8F6F2]"
                          >
                            {isi}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 p-1.5 opacity-60">
                            {isi}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {items.length > 0 && (
                <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
                  <span className="text-xs text-[#8B8478]">
                    {t("outfit.estimateTotal")}
                  </span>
                  <span className="text-sm font-semibold text-[#1E1C18]">
                    {rupiahOutfit(totalHarga)}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">
              <PublicOutfitActions
                outfitId={outfit.id}
                variantIds={variantIds}
                canSave={!milikSendiri}
                loggedIn={Boolean(user)}
              />
              {milikSendiri ? (
                <Link
                  href={`/outfit-saya/${outfit.id}`}
                  className="mt-3 block text-center text-[11px] font-medium text-[#8B6B5A]"
                >
                  {t("outfit.manageMine")}
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
