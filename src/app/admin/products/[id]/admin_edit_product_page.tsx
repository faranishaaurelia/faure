import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";

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
        product_images ( id, url, cutout_url, sort_order )
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
      <h1 className="text-[22px] font-bold text-[#202124] mb-6">Ubah Produk</h1>
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
          variants: (product.product_variants ?? []).map((v: any) => ({
            id: v.id,
            size: v.size ?? "",
            color: v.color ?? "",
            stock: v.stock ?? 0,
            extra_price: Number(v.extra_price ?? 0),
            sku: v.sku ?? "",
            image_url: v.image_url ?? "",
          })),
          images: images.map((img: any) => ({
            id: img.id,
            url: img.url,
            cutout_url: img.cutout_url ?? null,
            sort_order: img.sort_order ?? 0,
          })),
        }}
      />
    </div>
  );
}
