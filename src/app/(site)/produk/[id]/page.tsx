import { createClient } from "@/lib/supabase/server";
import AddToCartForm from "@/components/product/AddToCartForm";
import ProductGallery from "@/components/product/ProductGallery";
import ChatWidget from "@/components/chat/ChatWidget";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { dateLocale, translateCategory } from "@/lib/i18n";
import {
  KOLOM_MESSAGE,
  type ChatMessage,
} from "@/lib/chat";

export const dynamic = "force-dynamic";

function formatHarga(angka: number) {
  return `Rp ${angka.toLocaleString("id-ID")}`;
}

export default async function DetailProdukPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { t, locale } = await getT();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      description,
      brand,
      material,
      base_price,
      categories ( name ),
      product_variants ( id, size, color, stock, extra_price, image_url ),
      product_images ( url, sort_order )
    `,
    )
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!product) {
    notFound();
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating, comment, created_at")
    .eq("product_id", id)
    .order("created_at", { ascending: false });

  const jumlahUlasan = reviews?.length ?? 0;
  const rataRating =
    jumlahUlasan > 0
      ? (
          reviews!.reduce((sum, review) => sum + review.rating, 0) /
          jumlahUlasan
        ).toFixed(1)
      : null;

  // ---------- Chat produk ----------
  // Thread chat unik per (produk, user). Data awal diambil di server supaya
  // widget bisa langsung menampilkan riwayat tanpa loading di client.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let chatConvId: number | null = null;
  let chatMessages: ChatMessage[] = [];

  if (user) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("context_type", "product")
      .eq("context_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conv) {
      chatConvId = conv.id;
      const { data: msgs } = await supabase
        .from("messages")
        .select(KOLOM_MESSAGE)
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });

      chatMessages = (msgs as ChatMessage[] | null) ?? [];
    }
  }

  /* Ambil gambar dari product_images terlebih dahulu. Jika kosong, gunakan image_url varian. */
  type GambarProdukRow = { url: string; sort_order?: number | null };
  type VarianRowLite = { image_url?: string | null; stock?: number | null };

  const galeriDariProductImages: string[] = [
    ...(product.product_images ?? []),
  ]
    .sort(
      (a: GambarProdukRow, b: GambarProdukRow) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0),
    )
    .map((image: GambarProdukRow) => image.url);

  const images: string[] =
    galeriDariProductImages.length > 0
      ? galeriDariProductImages
      : (product.product_variants ?? [])
          .map((variant: VarianRowLite) => variant.image_url)
          .filter((url): url is string => Boolean(url))
          .filter(
            (url: string, index: number, self: string[]) =>
              self.indexOf(url) === index,
          );

  const totalStok =
    product.product_variants?.reduce(
      (total: number, variant: VarianRowLite) =>
        total + (variant.stock ?? 0),
      0,
    ) ?? 0;

  const rawCategoryName = (
    product.categories as { name?: string } | null | undefined
  )?.name ?? "";
  const categoryDisplayName = rawCategoryName
    ? translateCategory(t, rawCategoryName)
    : t("product.defaultCategory");

  return (
    <main className="min-h-screen bg-white pb-20 pt-[96px] text-[#1E1C18]">
      <div className="site-container max-w-5xl">
        {/* ===================== KEMBALI KE KOLEKSI ===================== */}
        <Link
          href="/produk"
          aria-label={t("product.backToCollection")}
          className="group mb-8 inline-flex items-center gap-2 text-[13px] text-[#746C64] transition-colors hover:text-[#1E1C18]"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:-translate-x-1"
          >
            <path d="M19 12H5" />
            <path d="M11 6L5 12L11 18" />
          </svg>

          <span className="relative">
            {t("product.backToCollection")}
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#1E1C18] transition-all duration-200 group-hover:w-full" />
          </span>
        </Link>

        {/* ===================== DETAIL PRODUK ===================== */}
        <section className="grid grid-cols-1 gap-10 md:grid-cols-[360px_minmax(0,1fr)] md:items-start md:gap-16">
          {/* GALERI */}
          <div className="mx-auto w-full max-w-[360px] md:mx-0 md:sticky md:top-[110px]">
            <ProductGallery images={images} productName={product.name} />
          </div>

          {/* INFORMASI PRODUK */}
          <div className="max-w-xl">
            {/* Kategori */}
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-[#9A7B69]">
              {categoryDisplayName}
            </p>

            {/* Nama produk */}
            <h1 className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-[#24211E] md:text-3xl">
              {product.name}
            </h1>

            {/* RATING */}
            <div className="mt-3 flex items-center gap-2 text-sm">
              {rataRating ? (
                <>
                  <span className="text-[#B18452]">★</span>
                  <span className="font-medium text-[#34302C]">{rataRating}</span>
                  <a
                    href="#ulasan"
                    className="text-[#8B8478] underline-offset-4 transition hover:text-[#34302C] hover:underline"
                  >
                    {t("product.reviewsCount", { count: jumlahUlasan })}
                  </a>
                </>
              ) : (
                <span className="text-[#8B8478]">{t("product.noRating")}</span>
              )}
            </div>

            {/* HARGA */}
            <div className="mt-5">
              <p className="text-2xl font-semibold tracking-[-0.01em]">
                {formatHarga(product.base_price)}
              </p>
              <p className="mt-1 text-xs text-[#969087]">
                {t("product.priceNote")}
              </p>
            </div>

            {/* DESKRIPSI */}
            {product.description && (
              <p className="mt-5 max-w-lg text-sm leading-6 text-[#706A63]">
                {product.description}
              </p>
            )}

            {/* DETAIL SPESIFIKASI */}
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-[#EFEAE4] py-5 text-sm">
              {product.brand && (
                <div>
                  <dt className="mb-0.5 text-xs text-[#A19A92]">
                    {t("product.brand")}
                  </dt>
                  <dd className="font-medium text-[#34302C]">
                    {product.brand}
                  </dd>
                </div>
              )}

              {product.material && (
                <div>
                  <dt className="mb-0.5 text-xs text-[#A19A92]">
                    {t("product.material")}
                  </dt>
                  <dd className="font-medium text-[#34302C]">
                    {product.material}
                  </dd>
                </div>
              )}

              <div>
                <dt className="mb-0.5 text-xs text-[#A19A92]">
                  {t("product.availability")}
                </dt>
                <dd
                  className={`font-medium ${totalStok > 0 ? "text-[#536B51]" : "text-[#A05245]"}`}
                >
                  {totalStok > 0
                    ? t("product.inStock", { count: totalStok })
                    : t("product.outOfStock")}
                </dd>
              </div>

              <div>
                <dt className="mb-0.5 text-xs text-[#A19A92]">
                  {t("product.shipping")}
                </dt>
                <dd className="font-medium text-[#34302C]">
                  {t("product.shippingAll")}
                </dd>
              </div>
            </dl>

            {/* VARIAN + KERANJANG */}
            <div className="mt-6">
              <AddToCartForm variants={product.product_variants ?? []} />

              {/* Mix & Match */}
              <Link
                href={`/outfit/buat`}
                className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-full border border-[#D9D0C7] text-sm font-medium text-[#51483F] transition hover:bg-[#F8F4F0]"
              >
                {t("product.mixMatch")}
              </Link>
            </div>
          </div>
        </section>

        {/* ===================== ULASAN ===================== */}
        <section id="ulasan" className="mt-16 scroll-mt-24 md:mt-20">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-[-0.01em]">
              {t("product.buyerReviews")}
            </h2>
            {rataRating && (
              <p className="text-sm text-[#8B8478]">
                <span className="text-[#B18452]">★</span>{" "}
                <span className="font-medium text-[#1E1C18]">{rataRating}</span>{" "}
                {t("product.ratingFrom", { count: jumlahUlasan })}
              </p>
            )}
          </div>

          {/* DAFTAR ULASAN */}
          {reviews && reviews.length > 0 ? (
            <div className="divide-y divide-[#EFEAE4] border-y border-[#EFEAE4]">
              {reviews.map((review, i) => (
                <article key={i} className="py-5">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* Rating */}
                      <div className="flex text-sm">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={
                              star <= review.rating
                                ? "text-[#B18452]"
                                : "text-[#D8D1CA]"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      {/* Nama */}
                      <span className="text-sm font-medium text-[#34302C]">
                        {t("product.faureBuyer")}
                      </span>
                    </div>
                    {/* Tanggal */}
                    <span className="text-xs text-[#969087]">
                      {new Date(review.created_at).toLocaleDateString(
                        dateLocale(locale),
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>
                  {/* Komentar */}
                  {review.comment ? (
                    <p className="text-sm leading-6 text-[#706A63]">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="text-sm italic text-[#9A938B]">
                      {t("product.ratingNoComment")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#DCD5CE] py-10 text-center">
              <p className="text-sm font-medium">{t("product.noReviewsTitle")}</p>
              <p className="mt-1 text-xs text-[#8B8478]">
                {t("product.noReviewsBody")}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ===================== CHAT PRODUK ===================== */}
      <ChatWidget
        contextType="product"
        contextId={product.id}
        title={product.name}
        initialConversationId={chatConvId}
        initialMessages={chatMessages}
        isSignedIn={Boolean(user)}
        currentUserId={user?.id ?? null}
      />
    </main>
  );
}
