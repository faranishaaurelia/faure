import { createClient } from "@/lib/supabase/server";
import CategoryManager from "@/components/admin/CategoryManager";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

const styleSvg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IKON = {
  tag: (
    <svg {...styleSvg}>
      <path d="M12.6 2.9H4a1 1 0 0 0-1 1v8.6a1 1 0 0 0 .3.7l8.9 8.9a2 2 0 0 0 2.8 0l7.6-7.6a2 2 0 0 0 0-2.8l-8.9-8.9a1 1 0 0 0-.7-.3z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  ),
  kotak: (
    <svg {...styleSvg}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  ),
  kosong: (
    <svg {...styleSvg}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </svg>
  ),
  tanpa: (
    <svg {...styleSvg}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9.5 9.5h5v5h-5z" />
    </svg>
  ),
};

export default async function AdminCategoriesPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("products").select("id, category_id").eq("is_active", true),
  ]);

  const counts = new Map<number, number>();
  for (const produk of products ?? []) {
    counts.set(produk.category_id, (counts.get(produk.category_id) ?? 0) + 1);
  }

  const semua = (categories ?? []).length;
  const denganProduk = (categories ?? []).filter(
    (c) => (counts.get(c.id) ?? 0) > 0,
  ).length;
  const kosong = semua - denganProduk;
  const tanpaKategori = (products ?? []).filter(
    (p) => p.category_id == null,
  ).length;

  const ringkasan = [
    {
      label: "Total Kategori",
      value: String(semua),
      hint: "Grup koleksi",
      icon: IKON.tag,
    },
    {
      label: "Berisi Produk",
      value: String(denganProduk),
      hint: "Kategori terpakai",
      icon: IKON.kotak,
    },
    {
      label: "Kategori Kosong",
      value: String(kosong),
      hint: "Belum ada produk",
      icon: IKON.kosong,
    },
    {
      label: "Tanpa Kategori",
      value: String(tanpaKategori),
      hint: "Produk belum dikelompokkan",
      icon: IKON.tanpa,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Kategori"
        description="Kelompokkan koleksi seperti kaus, kemeja, dan celana."
      />

      {/* ===== Ringkasan ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {ringkasan.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-[22px] border border-black/5 shadow-sm p-5"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F3EE] text-[#8B6B5A]">
              {item.icon}
            </span>
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
              {item.label}
            </p>
            <p className="mt-2 font-serif text-[28px] leading-none tracking-[-0.03em] text-[#1E1C18]">
              {item.value}
            </p>
            <p className="mt-2 text-[12px] text-[#8A837B]">{item.hint}</p>
          </div>
        ))}
      </div>

      <CategoryManager
        categories={(categories ?? []).map((item) => ({
          ...item,
          product_count: counts.get(item.id) ?? 0,
        }))}
      />
    </div>
  );
}