import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type VariantRow = {
  id?: number;
  size?: string | null;
  color?: string | null;
  stock?: number | null;
  extra_price?: number | string | null;
  sku?: string | null;
  image_url?: string | null;
};

type ImageRow = {
  id?: number;
  url: string;
  sort_order?: number | null;
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
        id, name, slug, description, brand, gender, material, category_id, base_price,
        product_variants ( id, size, color, stock, extra_price, sku, image_url ),
        product_images ( id, url, sort_order )
      `,
      )
      .eq("id", id)
      .single(),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  if (!product) notFound();

  const images = [...(product.product_images ?? [])].sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  return (
    <div>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 mb-5 text-[12px] font-medium text-[#8B6B5A] hover:text-[#1E1C18] transition"
      >
        <span aria-hidden>←</span> Kembali ke daftar produk
      </Link>

      <AdminPageHeader
        kicker="Ubah Produk"
        title={product.name}
        description="Perbarui informasi, foto, dan stok varian produk ini."
      />
      <ProductForm
        categories={categories ?? []}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          brand: product.brand,
          gender: product.gender,
          material: product.material,
          category_id: product.category_id,
          base_price: Number(product.base_price),
          variants: (product.product_variants ?? []).map((v: VariantRow) => ({
            id: v.id,
            size: v.size ?? "",
            color: v.color ?? "",
            stock: v.stock ?? 0,
            extra_price: Number(v.extra_price ?? 0),
            sku: v.sku ?? "",
            image_url: v.image_url ?? "",
          })),
          images: images.map((img: ImageRow) => ({
            id: img.id,
            url: img.url,
            sort_order: img.sort_order ?? 0,
          })),
        }}
      />
    </div>
  );
}
