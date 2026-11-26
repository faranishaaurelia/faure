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
    <div className="pb-2">
      <Link
        href="/admin/products"
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8B6B5A] transition hover:text-[#1E1C18]"
      >
        <span aria-hidden>←</span> Kembali ke daftar produk
      </Link>

      <AdminPageHeader
        kicker="Koleksi"
        title="Tambah Produk"
        description="Lengkapi informasi, galeri foto, dan varian stok sebelum produk tampil di toko."
      />
      <ProductForm categories={categories ?? []} />
    </div>
  );
}
