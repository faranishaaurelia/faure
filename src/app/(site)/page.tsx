import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import Reveal from "@/components/animation/Reveal";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { translateCategory } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/* =====================================================
   HOME PAGE
===================================================== */

export default async function HomePage() {
  const { t } = await getT();
  const supabase = await createClient();

  const [
    { data: productsData, error },
    { data: kategoriData, error: errorKategori },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
          id,
          name,
          slug,
          base_price,
          category_id,
          product_variants ( size, color, extra_price, image_url ),
          product_images ( url, sort_order )
        `,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false }),

    supabase.from("categories").select("id, name").order("id"),
  ]);

  if (error) {
    console.error("Gagal fetch produk:", error.message);
  }

  if (errorKategori) {
    console.error("Gagal fetch kategori:", errorKategori.message);
  }

  const kategoriPerId = new Map(
    (kategoriData ?? []).map((k) => [k.id as number, k.name as string]),
  );

  // =====================================================
  // OLAH DATA MENTAH JADI BENTUK KARTU PRODUK
  // =====================================================

  const semuaProduk = (productsData ?? []).map((produk) => {
    const variants = produk.product_variants ?? [];

    // Harga termurah = harga dasar + selisih harga varian paling kecil
    const hargaTermurah =
      variants.length > 0
        ? Math.min(
            ...variants.map((v) => produk.base_price + (v.extra_price ?? 0)),
          )
        : produk.base_price;

    // Foto 1 untuk kartu = product_images dengan sort_order terkecil.
    // Fallback ke image_url varian kalau galeri masih kosong.
    const galeri = [...(produk.product_images ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const gambar =
      galeri[0]?.url ?? variants.find((v) => v.image_url)?.image_url ?? undefined;

    const kategoriNama = kategoriPerId.get(produk.category_id) ?? "";

    return {
      id: produk.id,
      nama: produk.name,
      kategori: translateCategory(t, kategoriNama),
      harga: hargaTermurah,
      gambar,
    };
  });

  // 5 produk terbaru tampil di bagian "Produk"
  const produk = semuaProduk.slice(0, 5);

  // Rekomendasi: pilihan dengan harga paling bersahabat
  const rekomendasi = [...semuaProduk]
    .sort((a, b) => a.harga - b.harga)
    .slice(0, 5);

  return (
    <main className="bg-white text-[#252525]">
      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative h-[430px] md:h-[600px] overflow-hidden">
        {/* FOTO HERO */}
        <img
          src="/images/hero.png"
          alt="Faure Fashion"
          className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
        />

        {/* OVERLAY TIPIS */}
        <div className="absolute inset-0 bg-black/[0.04]" />

        {/* KONTEN HERO */}
        <div className="absolute inset-0 z-10 flex items-center pt-16">
          <div className="site-container w-full">
            <Reveal direction="left" duration={900}>
              <div className="max-w-[760px]">
                <h1 className="text-[38px] md:text-[52px] lg:text-[64px] font-serif font-medium leading-[1.05] tracking-tight text-[#252525]">
                  {t("home.heroTitle1")}
                  <br />
                  <span className="text-[#5C5A58]">{t("home.heroTitle2")}</span>
                </h1>

                <p className="mt-4 max-w-[620px] text-sm md:text-[15px] leading-6 text-[#5C554F]">
                  {t("home.heroBody")}
                </p>

                <Link
                  href="/produk"
                  className="
                    inline-flex
                    mt-6
                    items-center
                    gap-3
                    bg-[#242424]
                    text-white
                    px-7
                    py-3
                    rounded-full
                    text-sm
                    md:text-[15px]
                    font-medium
                    hover:bg-black
                    transition
                  "
                >
                  {t("home.startShopping")}
                  <span className="text-base">→</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =====================================================
          INFORMASI FAURE
      ===================================================== */}

      <section className="w-full bg-white">
        {/* =========================
            INTRO
        ========================= */}

        <div className="site-container py-20 md:py-24 text-center">
          <Reveal>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-[#9A7965] font-medium">
              {t("home.aboutEyebrow")}
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="w-12 h-[1px] bg-[#A98B78] mx-auto mt-5 mb-6" />
          </Reveal>

          <Reveal delay={150}>
            <h2 className="text-[36px] md:text-[52px] lg:text-[58px] leading-[1.05] font-serif font-medium text-[#252525]">
              {t("home.aboutTitle1")}
              <br />
              {t("home.aboutTitle2")}
            </h2>
          </Reveal>

          <Reveal delay={250}>
            <p className="mt-7 max-w-[650px] mx-auto text-sm md:text-base leading-7 text-[#77716B]">
              {t("home.aboutBody")}
            </p>
          </Reveal>
        </div>

        {/* =========================
            BLOK 1
        ========================= */}

        <div className="bg-[#FBF8F4]">
          <div className="site-container py-16 md:py-20">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* TEXT */}
              <div className="order-2 md:order-1">
                <Reveal direction="left">
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#9A7965]">
                        Faure
                      </span>

                      <span className="w-12 h-[1px] bg-[#B9A79A]" />
                    </div>

                    <h3 className="font-serif text-[34px] md:text-[42px] lg:text-[46px] leading-[1.08] font-medium text-[#252525]">
                      {t("home.block1Title1")}
                      <br />
                      {t("home.block1Title2")}
                    </h3>

                    <p className="mt-6 max-w-[480px] text-sm md:text-[15px] leading-7 text-[#77716B]">
                      {t("home.block1Body")}
                    </p>
                  </div>
                </Reveal>
              </div>

              {/* IMAGE */}
              <div className="order-1 md:order-2">
                <Reveal direction="right" delay={150}>
                  <div className="aspect-[4/3] overflow-hidden rounded-[4px]">
                    <img
                      src="/images/tentang-cerita.jpg"
                      alt="Koleksi pakaian Faure"
                      className="
                        w-full
                        h-full
                        object-cover
                        transition-transform
                        duration-700
                        hover:scale-[1.02]
                      "
                    />
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </div>

        {/* =========================
            BLOK 2
        ========================= */}

        <div className="bg-[#F7F1E9]">
          <div className="site-container py-16 md:py-20">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* IMAGE */}
              <div>
                <Reveal direction="left">
                  <div className="aspect-[4/3] overflow-hidden rounded-[4px]">
                    <img
                      src="/images/tentang-faure.jpg"
                      alt="Fashion Faure"
                      className="
                        w-full
                        h-full
                        object-cover
                        transition-transform
                        duration-700
                        hover:scale-[1.02]
                      "
                    />
                  </div>
                </Reveal>
              </div>

              {/* TEXT */}
              <div>
                <Reveal direction="right" delay={150}>
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#9A7965]">
                        {t("home.ourStory")}
                      </span>

                      <span className="w-12 h-[1px] bg-[#B9A79A]" />
                    </div>

                    <h3 className="font-serif text-[34px] md:text-[42px] lg:text-[46px] leading-[1.08] font-medium text-[#252525]">
                      {t("home.block2Title1")}
                      <br />
                      {t("home.block2Title2")}
                    </h3>

                    <p className="mt-6 max-w-[480px] text-sm md:text-[15px] leading-7 text-[#77716B]">
                      {t("home.block2Body")}
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          KENAPA FAURE
      ===================================================== */}

      <section className="py-20 md:py-28">
        <div className="site-container">
          {/* HEADER */}
          <div className="text-center mb-14 md:mb-20">
            <Reveal>
              <p className="font-serif text-[10px] md:text-xs uppercase tracking-[0.25em] text-[#8B6B5A] mb-4">
                {t("home.whyEyebrow")}
              </p>
            </Reveal>

            <Reveal delay={100}>
              <h2 className="font-serif text-3xl md:text-5xl font-semibold tracking-tight">
                {t("home.whyTitle")}
              </h2>
            </Reveal>
          </div>

          {/* ITEMS */}
          <div className="space-y-14 md:space-y-16">
            {/* =================================================
                01
            ================================================= */}

            <div className="flex items-center gap-6 md:gap-12">
              <Reveal direction="left">
                <span className="font-serif text-6xl md:text-8xl font-light text-[#C9C2BA] leading-none">
                  01
                </span>
              </Reveal>

              <Reveal direction="up" delay={150}>
                <div>
                  <h3 className="font-serif text-lg md:text-2xl font-semibold">
                    {t("home.why1Title")}
                  </h3>

                  <p className="font-serif mt-2 text-xs md:text-sm text-[#77716B] leading-relaxed max-w-[420px]">
                    {t("home.why1Body")}
                  </p>
                </div>
              </Reveal>
            </div>

            {/* =================================================
                02
            ================================================= */}

            <div className="flex items-center gap-6 md:gap-12 md:justify-end">
              <Reveal direction="left" delay={150}>
                <div className="order-2 md:order-1">
                  <h3 className="font-serif text-lg md:text-2xl font-semibold">
                    {t("home.why2Title")}
                  </h3>

                  <p className="font-serif mt-2 text-xs md:text-sm text-[#77716B] leading-relaxed max-w-[420px]">
                    {t("home.why2Body")}
                  </p>
                </div>
              </Reveal>

              <Reveal direction="right">
                <span className="order-1 md:order-2 font-serif text-6xl md:text-8xl font-light text-[#C9C2BA] leading-none">
                  02
                </span>
              </Reveal>
            </div>

            {/* =================================================
                03
            ================================================= */}

            <div className="flex items-center gap-6 md:gap-12">
              <Reveal direction="left">
                <span className="font-serif text-6xl md:text-8xl font-light text-[#C9C2BA] leading-none">
                  03
                </span>
              </Reveal>

              <Reveal direction="up" delay={150}>
                <div>
                  <h3 className="font-serif text-lg md:text-2xl font-semibold">
                    {t("home.why3Title")}
                  </h3>

                  <p className="font-serif mt-2 text-xs md:text-sm text-[#77716B] leading-relaxed max-w-[420px]">
                    {t("home.why3Body")}
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          BANNER
      ===================================================== */}

      <section className="site-container pb-20 md:pb-28">
        <Reveal duration={900}>
          <div className="relative h-[180px] md:h-[300px] overflow-hidden rounded-2xl">
            <img
              src="/images/banner1.jpeg"
              alt="Faure Collection"
              className="
                w-full
                h-full
                object-cover
                transition-transform
                duration-[1200ms]
                hover:scale-[1.03]
              "
            />

            <div className="absolute inset-0 bg-black/10" />

            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div>
                <Reveal delay={100}>
                  <p className="font-serif text-white text-[10px] md:text-xs uppercase tracking-[0.25em] mb-3">
                    Faure
                  </p>
                </Reveal>

                <Reveal delay={200}>
                  <h2 className="font-serif text-white text-2xl md:text-4xl font-semibold">
                    {t("home.bannerTitle")}
                  </h2>
                </Reveal>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* =====================================================
          PRODUK
      ===================================================== */}

      <section className="site-container pb-20">
        {/* HEADER */}
        <Reveal>
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#8B6B5A] mb-2">
                {t("home.picksEyebrow")}
              </p>

              <h2 className="text-2xl md:text-3xl font-semibold">
                {t("home.products")}
              </h2>
            </div>

            <Link
              href="/produk"
              className="text-xs md:text-sm text-[#55504B] hover:text-black transition"
            >
              {t("home.seeAll")}
            </Link>
          </div>
        </Reveal>

        {/* PRODUCT GRID */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
          {produk.map((item, index) => (
            <Reveal key={item.id} delay={index * 100} duration={650}>
              <ProductCard {...item} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* =====================================================
          REKOMENDASI
      ===================================================== */}

      <section className="bg-[#F8F8F8]">
        <div className="site-container py-20 md:py-24">
          {/* HEADER */}
          <Reveal>
            <div className="flex items-end justify-between mb-7">
              <div>
                <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#8B6B5A] mb-2">
                  {t("home.forYou")}
                </p>

                <h2 className="text-2xl md:text-3xl font-semibold">
                  {t("home.recommendations")}
                </h2>
              </div>

              <Link
                href="/produk"
                className="text-xs md:text-sm text-[#55504B] hover:text-black transition"
              >
                {t("home.seeAll")}
              </Link>
            </div>
          </Reveal>

          {/* PRODUCT GRID */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
            {rekomendasi.map((item, index) => (
              <Reveal key={item.id} delay={index * 100} duration={650}>
                <ProductCard {...item} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
