import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export default async function AdminNewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return (
    <div>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 mb-5 text-[12px] font-medium text-[#8B6B5A] hover:text-[#1E1C18] transition"
      >
        <span aria-hidden>←</span> Kembali ke daftar produk
      </Link>

      <AdminPageHeader
        kicker="Koleksi"
        title="Tambah Produk"
        description="Isi informasi, foto, dan varian stok. Slug dibuat otomatis dari nama produk."
      />
      <ProductForm categories={categories ?? []} />
    </div>
  );
}
