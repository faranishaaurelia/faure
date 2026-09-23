import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT, dateLocale } from "@/lib/i18n/server";
import ReviewForm from "@/components/review/ReviewForm";
import { fotoProduk, type GambarProduk } from "@/lib/images";

function formatTanggal(tanggal: string, locale?: string) {
  return new Date(tanggal).toLocaleDateString(locale ?? "id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type VarianLemari = {
  id: number;
  size: string | null;
  color: string | null;
  image_url: string | null;
  products:
    | { id: number; name: string; product_images?: GambarProduk | GambarProduk[] | null }
    | { id: number; name: string; product_images?: GambarProduk | GambarProduk[] | null }[]
    | null;
};

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function DetailLemariPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    notFound();
  }

  const { t, locale } = await getT();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("closet_items")
    .select(
      `
      id,
      added_at,
      order_item_id,
      product_variants (
        id,
        size,
        color,
        image_url,
        products (
          id,
          name,
          product_images (
            url,
            sort_order
          )
        )
      )
    `,
    )
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) notFound();

  const variant = satu(
    (data as { product_variants: VarianLemari | VarianLemari[] | null })
      .product_variants,
  );
  const produk = variant ? satu(variant.products) : null;

  const produkId = produk?.id ?? null;

  // Ulasan user untuk produk ini (kalau sudah pernah)
  const { data: ulasan } = produkId
    ? await supabase
        .from("reviews")
        .select("rating, comment, created_at")
        .eq("user_id", user.id)
        .eq("product_id", produkId)
        .maybeSingle()
    : { data: null };

  const varianLabel = [
    variant?.size ? t("product.sizeWith", { size: variant.size }) : null,
    variant?.color,
  ]
    .filter(Boolean)
    .join(", ");

  // Foto produk: gambar varian kalau ada, kalau tidak dari galeri produk.
  const gambar = fotoProduk(variant, produk);

  return (
    <div>
      {/* ===================== KEMBALI ===================== */}
      <Link
        href="/lemari"
        className="inline-flex items-center gap-2 text-xs text-[#8B8478] hover:text-[#1E1C18] transition"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5">
          <path
            d="M16 10H4M9 5L4 10L9 15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t("account.backToCloset")}
      </Link>

      {/* ===================== DETAIL BARANG ===================== */}
      <div className="mt-5 grid md:grid-cols-[280px_1fr] gap-6 md:gap-10 items-start">
        <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-4">
          <div className="w-full aspect-[3/4] bg-[#EAE4DC] rounded-xl overflow-hidden">
            {gambar ? (
              <img
                src={gambar}
                alt={produk?.name ?? t("common.product")}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#8B8478] text-xs">
                {t("account.noImage")}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-6 md:p-7">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9A7B69] font-semibold">
              {t("account.fromCloset")}
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-[-0.02em] text-[#1E1C18]">
              {produk?.name ?? t("common.product")}
            </h1>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[#EFEAE4] pt-5 text-sm">
              {varianLabel && (
                <div>
                  <dt className="text-xs text-[#A19A92]">{t("account.variant")}</dt>
                  <dd className="font-medium text-[#34302C]">{varianLabel}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-[#A19A92]">
                  {t("account.addedToCloset")}
                </dt>
                <dd className="font-medium text-[#34302C]">
                  {formatTanggal(data.added_at, dateLocale(locale))}
                </dd>
              </div>
              {produkId && (
                <div>
                  <dt className="text-xs text-[#A19A92]">
                    {t("account.productPage")}
                  </dt>
                  <dd>
                    <Link
                      href={`/produk/${produkId}`}
                      className="font-medium text-[#8B6B5A] hover:text-[#1E1C18] transition"
                    >
                      {t("account.viewProduct")}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* ===================== ULASAN ===================== */}
          <section
            id="ulasan"
            className="bg-white rounded-[24px] border border-black/5 shadow-sm p-6 md:p-7 scroll-mt-28"
          >
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#1E1C18]">
              {t("account.giveReview")}
            </h2>
            <p className="mt-1 text-sm text-[#8B8478]">
              {t("account.giveReviewSub")}
            </p>

            <div className="mt-5">
              {ulasan ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex text-lg">
                      {[1, 2, 3, 4, 5].map((bintang) => (
                        <span
                          key={bintang}
                          className={
                            bintang <= ulasan.rating
                              ? "text-[#B18452]"
                              : "text-[#D8D1CA]"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-[#8B8478]">
                      {t("account.reviewedOn", {
                        date: formatTanggal(ulasan.created_at, dateLocale(locale)),
                      })}
                    </span>
                  </div>
                  {ulasan.comment && (
                    <p className="mt-3 text-sm leading-6 text-[#706A63]">
                      {ulasan.comment}
                    </p>
                  )}
                  <p className="mt-4 text-[12px] text-[#6BA06B] font-medium">
                    {t("account.reviewedThanks")}
                  </p>
                </div>
              ) : (
                <ReviewForm
                  orderItemId={data.order_item_id}
                  productName={produk?.name ?? t("product.thisProduct")}
                  variantLabel={varianLabel || null}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}