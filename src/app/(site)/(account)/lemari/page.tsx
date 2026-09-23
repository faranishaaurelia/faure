import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { fotoProduk, type GambarProduk } from "@/lib/images";

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

type BarisLemari = {
  id: number;
  added_at: string;
  product_variants: VarianLemari | VarianLemari[] | null;
};

function satu<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function LemariPage() {
  const { t } = await getT();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: closetItems } = await supabase
    .from("closet_items")
    .select(
      `
      id,
      added_at,
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
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  // Produk yang sudah diulas user (untuk status tombol ulasan)
  const { data: ulasan } = await supabase
    .from("reviews")
    .select("product_id")
    .eq("user_id", user.id);

  const sudahDiulas = new Set((ulasan ?? []).map((r) => r.product_id));

  const items = ((closetItems ?? []) as BarisLemari[]).map((item) => {
    const variant = satu(item.product_variants);
    const product = variant ? satu(variant.products) : null;
    const produkId = product?.id ?? null;
    return {
      id: item.id,
      produkId,
      nama: product?.name ?? t("common.product"),
      ukuran: variant?.size ?? null,
      warna: variant?.color ?? null,
      gambar: fotoProduk(variant, product),
      sudahDiulas: produkId != null && sudahDiulas.has(produkId),
    };
  });

  return (
    <div>
        {/* ===================== HEADER ===================== */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2B2B2B] mb-1">
              {t("account.closetTitle")}
            </h1>
            <p className="text-sm text-[#8B8478]">
              {t("account.closetBody")}
            </p>
          </div>

          {items.length > 0 && (
            <Link
              href="/outfit/buat"
              className="inline-flex items-center gap-2 bg-[#1E1C18] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-black transition"
            >
              {t("account.mixThere")}
            </Link>
          )}
        </div>

        {/* ===================== KONTEN ===================== */}
        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[24px] border border-black/5">
            <div className="w-16 h-16 rounded-full bg-[#EBEBEB] flex items-center justify-center mx-auto mb-5 text-[#8B6B5A]">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M9 3v18M15 3v18" />
              </svg>
            </div>
            <p className="text-[#1E1C18] font-semibold mb-2">
              {t("account.closetEmpty")}
            </p>
            <p className="text-sm text-[#8B8478] max-w-sm mx-auto mb-6">
              {t("account.closetEmptyBody")}
            </p>
            <Link
              href="/produk"
              className="inline-flex items-center gap-2 bg-[#1E1C18] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-black transition"
            >
              {t("account.startShopping")}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[#656058] mb-5">
              <span className="font-semibold text-[#1E1C18]">
                {items.length}
              </span>{" "}
              {t("account.itemsSaved")}
            </p>

            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <article key={item.id} className="group">
                  <Link href={`/lemari/${item.id}`} className="block">
                    <div className="aspect-[3/4] overflow-hidden rounded-sm bg-[#F3F0EB]">
                      {item.gambar ? (
                        <img
                          src={item.gambar}
                          alt={item.nama}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-[#9A938C]">
                          {t("account.noImage")}
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <p className="truncate text-[11px] font-medium leading-snug text-[#1A1A1A]">
                        {item.nama}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] leading-snug text-[#9A938C]">
                        {[
                          item.ukuran
                            ? t("product.sizeWith", { size: item.ukuran })
                            : null,
                          item.warna,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </Link>

                  {item.sudahDiulas ? (
                    <p className="mt-1 text-[10px] font-medium text-[#6BA06B]">
                      {t("account.reviewed")}
                    </p>
                  ) : (
                    <Link
                      href={`/lemari/${item.id}#ulasan`}
                      className="mt-1 inline-block text-[10px] font-medium text-[#9A938C] transition hover:text-[#1E1C18]"
                    >
                      {t("account.writeReview")}
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
    </div>
  );
}