"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveProduct,
  uploadProductImage,
  type ImageInput,
  type ProductInput,
  type VariantInput,
} from "@/lib/actions/admin";
import { UKURAN_LIST } from "@/lib/sizes";
import { hapusLatar } from "@/lib/removeBg";

type CategoryOption = { id: number; name: string };

type FormVariant = {
  key: string;
  id?: number;
  size: string;
  color: string;
  stock: string;
  extra_price: string;
  sku: string;
  image_url: string;
};

type FormImage = {
  key: string;
  id?: number;
  url: string;
  cutout_url: string; // PNG transparan hasil remove background, "" kalau belum ada
};

const inputClass =
  "w-full h-10 px-3 rounded-lg border border-[#d5d5d5] text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-[#303030]";

function emptyVariant(): FormVariant {
  return {
    key: crypto.randomUUID(),
    size: "",
    color: "",
    stock: "0",
    extra_price: "0",
    sku: "",
    image_url: "",
  };
}

function emptyImage(): FormImage {
  return { key: crypto.randomUUID(), url: "", cutout_url: "" };
}

// Upload sebuah Blob (hasil remove background) lewat action yang sama
// dengan upload file biasa — action-nya menerima File apa saja di FormData.
async function uploadBlob(blob: Blob, namaFile: string) {
  const file = new File([blob], namaFile, { type: "image/png" });
  const form = new FormData();
  form.append("file", file);
  return uploadProductImage(form);
}

export default function ProductForm({
  categories,
  product,
}: {
  categories: CategoryOption[];
  product?: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    brand: string | null;
    gender: string | null;
    material: string | null;
    category_id: number;
    base_price: number;
    variants: VariantInput[];
    images: ImageInput[];
  };
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status upload foto baru dari komputer
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Key foto yang sedang diproses "Hapus Background" satu per satu
  // (dipakai untuk retrofit foto lama / URL manual)
  const [memprosesKeys, setMemprosesKeys] = useState<Set<string>>(new Set());
  const [bgError, setBgError] = useState<Record<string, string>>({});

  // Slug & SKU tidak lagi diisi manual. Slug dibuat otomatis dari nama
  // produk oleh server; SKU lama tetap dipertahankan supaya tidak hilang
  // saat produk yang sudah ada disimpan ulang.
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [gender, setGender] = useState(product?.gender ?? "");
  const [material, setMaterial] = useState(product?.material ?? "");
  const [categoryId, setCategoryId] = useState(
    product?.category_id ? String(product.category_id) : "",
  );
  const [basePrice, setBasePrice] = useState(
    product ? String(product.base_price) : "",
  );
  const [variants, setVariants] = useState<FormVariant[]>(
    product?.variants.length
      ? product.variants.map((v) => ({
          key: String(v.id ?? crypto.randomUUID()),
          id: v.id,
          size: v.size ?? "",
          color: v.color ?? "",
          stock: String(v.stock ?? 0),
          extra_price: String(v.extra_price ?? 0),
          sku: v.sku ?? "",
          image_url: v.image_url ?? "",
        }))
      : [emptyVariant()],
  );
  const [images, setImages] = useState<FormImage[]>(
    product?.images.length
      ? product.images.map((img) => ({
          key: String(img.id ?? crypto.randomUUID()),
          id: img.id,
          url: img.url,
          cutout_url: img.cutout_url ?? "",
        }))
      : [emptyImage()],
  );

  function updateVariant(key: string, field: keyof FormVariant, value: string) {
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)),
    );
  }

  // Ukuran yang sudah punya baris varian — dipakai untuk status checklist.
  const ukuranDipilih = new Set(
    variants.map((v) => v.size.trim().toUpperCase()).filter(Boolean),
  );

  // Centang = tambah baris varian untuk ukuran itu; hapus centang = buang barisnya.
  function toggleUkuran(ukuran: string) {
    setVariants((prev) => {
      const ada = prev.some((v) => v.size.trim().toUpperCase() === ukuran);

      if (ada) {
        return prev.filter((v) => v.size.trim().toUpperCase() !== ukuran);
      }

      const contoh = prev[0];
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          size: ukuran,
          color: contoh?.color ?? "",
          stock: "0",
          extra_price: contoh?.extra_price ?? "0",
          sku: "",
          image_url: "",
        },
      ];
    });
  }

  // ===== Upload dari komputer: cukup upload foto aslinya. Background
  // TIDAK dihapus otomatis — biarkan foto seadanya, lalu admin bisa
  // menekan tombol "Hapus Background" pada foto di bawah kalau mau. =====
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      for (const file of Array.from(files)) {
        setUploadStatus(`Mengupload ${file.name}...`);

        const form = new FormData();
        form.append("file", file);
        const hasilAsli = await uploadProductImage(form);

        if (hasilAsli.error || !hasilAsli.url) {
          setUploadError(hasilAsli.error ?? "Gagal mengupload gambar.");
          continue;
        }

        setImages((prev) => [
          ...prev,
          {
            key: crypto.randomUUID(),
            url: hasilAsli.url,
            cutout_url: "",
          },
        ]);
      }
    } finally {
      setUploading(false);
      setUploadStatus(null);
    }
  }

  // ===== Retrofit: hapus background dari foto yang sudah ada
  // (foto lama, atau URL yang ditempel manual). Mengambil gambar
  // dari URL-nya, jadi perlu bucket/host yang mengizinkan fetch lintas asal. =====
  async function handleHapusBackground(key: string) {
    const img = images.find((i) => i.key === key);
    if (!img || !img.url) return;

    setMemprosesKeys((prev) => new Set(prev).add(key));
    setBgError((prev) => {
      const salinan = { ...prev };
      delete salinan[key];
      return salinan;
    });

    try {
      const respons = await fetch(img.url);
      if (!respons.ok) throw new Error("Gagal mengambil gambar dari URL.");
      const blobAsli = await respons.blob();

      const blobBersih = await hapusLatar(blobAsli);
      const hasil = await uploadBlob(blobBersih, `${crypto.randomUUID()}.png`);

      if (hasil.error || !hasil.url) {
        throw new Error(hasil.error ?? "Gagal mengupload hasil.");
      }

      setImages((prev) =>
        prev.map((item) =>
          item.key === key ? { ...item, cutout_url: hasil.url! } : item,
        ),
      );
    } catch (e) {
      setBgError((prev) => ({
        ...prev,
        [key]:
          e instanceof Error
            ? e.message
            : "Gagal menghapus background. Coba upload ulang fotonya.",
      }));
    } finally {
      setMemprosesKeys((prev) => {
        const salinan = new Set(prev);
        salinan.delete(key);
        return salinan;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const payload: ProductInput = {
      id: product?.id,
      name,
      slug: product?.slug,
      description,
      brand,
      gender,
      material,
      category_id: Number(categoryId),
      base_price: Number(basePrice),
      variants: variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: Number(v.stock) || 0,
        extra_price: Number(v.extra_price) || 0,
        sku: v.sku,
        image_url: v.image_url,
      })),
      images: images.map((img, index) => ({
        id: img.id,
        url: img.url,
        cutout_url: img.cutout_url || null,
        sort_order: index,
      })),
    };

    const result = await saveProduct(payload);
    setIsPending(false);

    if (result.error || !result.id) {
      setError(result.error ?? "Gagal menyimpan produk.");
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <section className="bg-white rounded-xl border border-[#e5e5e5] p-5 space-y-4">
        <h2 className="text-[14px] font-semibold">Informasi Produk</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-[12px] text-[#666] space-y-1">
            <span>Nama</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-[12px] text-[#666] space-y-1">
            <span>Kategori</span>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[12px] text-[#666] space-y-1">
            <span>Harga dasar</span>
            <input
              required
              type="number"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-[12px] text-[#666] space-y-1">
            <span>Merek</span>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-[12px] text-[#666] space-y-1">
            <span>Gender</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={inputClass}
            >
              <option value="">Tidak ditentukan</option>
              <option value="unisex">Unisex</option>
              <option value="pria">Pria</option>
              <option value="wanita">Wanita</option>
            </select>
          </label>
          <label className="text-[12px] text-[#666] space-y-1 md:col-span-2">
            <span>Bahan</span>
            <input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-[12px] text-[#666] space-y-1 md:col-span-2">
            <span>Deskripsi</span>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#d5d5d5] text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-[#303030]"
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#e5e5e5] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">Foto Produk</h2>
          <button
            type="button"
            onClick={() => setImages((prev) => [...prev, emptyImage()])}
            className="text-[12px] font-medium text-[#8b6b5a] hover:underline"
          >
            + Tambah URL
          </button>
        </div>

        {/* ===== UPLOAD DARI KOMPUTER ===== */}
        <div className="rounded-xl border border-dashed border-[#d5d5d5] bg-[#FAFAF9] p-5">
          <label className="block cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              multiple
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files)}
              className="sr-only"
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-[#1e1c18] text-white text-[13px] font-semibold transition disabled:opacity-60">
                {uploading ? "Memproses..." : "Upload Gambar"}
              </span>
              <p className="text-[12px] text-[#888]">
                Pilih satu atau beberapa gambar dari komputer (JPG, PNG, WebP,
                AVIF, GIF — maks. 5 MB per file). Background tidak dihapus
                otomatis — klik &quot;Hapus Background&quot; pada foto di bawah
                kalau mau.
              </p>
            </div>
          </label>
          {uploadStatus && (
            <p className="mt-3 text-[12px] text-[#8b6b5a]">{uploadStatus}</p>
          )}
          {uploadError && (
            <p className="mt-3 text-[12px] text-[#B23B3B]">{uploadError}</p>
          )}
        </div>

        <p className="text-[12px] text-[#888]">
          Gambar hasil upload atau URL. Urutan dari atas ke bawah menjadi urutan
          galeri. Foto berlatar catur (▦) menandakan sudah punya versi tanpa
          background, dipakai di halaman Buat Outfit.
        </p>
        <div className="space-y-2">
          {images.map((img, index) => {
            const sedangDiproses = memprosesKeys.has(img.key);
            return (
              <div
                key={img.key}
                className="rounded-lg border border-[#eee] p-2"
              >
                <div className="flex gap-2 items-center">
                  {img.url && (
                    <div
                      className="w-10 h-10 rounded-lg border border-[#eee] shrink-0 overflow-hidden"
                      style={
                        img.cutout_url
                          ? {
                              backgroundImage:
                                "linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)",
                              backgroundSize: "8px 8px",
                              backgroundPosition:
                                "0 0, 0 4px, 4px -4px, -4px 0px",
                            }
                          : undefined
                      }
                    >
                      <img
                        src={img.cutout_url || img.url}
                        alt={`Pratinjau ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <input
                    value={img.url}
                    onChange={(e) =>
                      setImages((prev) =>
                        prev.map((item) =>
                          item.key === img.key
                            ? { ...item, url: e.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder={`URL foto ${index + 1}`}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImages((prev) =>
                        prev.filter((item) => item.key !== img.key),
                      )
                    }
                    className="px-3 text-[12px] text-[#B23B3B] shrink-0"
                  >
                    Hapus
                  </button>
                </div>

                {img.url && (
                  <div className="mt-2 flex items-center gap-2 pl-12">
                    {img.cutout_url ? (
                      <span className="text-[11px] text-[#3a7d44]">
                        ✓ Background sudah dihapus
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={sedangDiproses}
                        onClick={() => handleHapusBackground(img.key)}
                        className="text-[11px] font-medium text-[#8b6b5a] hover:underline disabled:opacity-50"
                      >
                        {sedangDiproses ? "Memproses..." : "Hapus Background"}
                      </button>
                    )}
                    {bgError[img.key] && (
                      <span className="text-[11px] text-[#B23B3B]">
                        {bgError[img.key]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#e5e5e5] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">
            Varian (ukuran, warna, stok)
          </h2>
          <button
            type="button"
            onClick={() => setVariants((prev) => [...prev, emptyVariant()])}
            className="text-[12px] font-medium text-[#8b6b5a] hover:underline"
          >
            + Tambah Varian
          </button>
        </div>

        {/* CHECKLIST UKURAN */}
        <div>
          <p className="text-[12px] text-[#666] mb-2">
            Ukuran tersedia{" "}
            <span className="text-[#999]">
              (centang ukuran yang dijual — varian dibuat otomatis)
            </span>
          </p>
          <div className="grid grid-cols-5 gap-1.5 max-w-md">
            {UKURAN_LIST.map((ukuran) => (
              <label key={ukuran} className="cursor-pointer">
                <input
                  type="checkbox"
                  checked={ukuranDipilih.has(ukuran)}
                  onChange={() => toggleUkuran(ukuran)}
                  className="sr-only peer"
                />

                <span
                  className="
                    h-9 flex items-center justify-center rounded-md
                    border border-[#d5d5d5] bg-white text-[12px] text-[#5F5953]
                    transition peer-checked:bg-[#1e1c18] peer-checked:border-[#1e1c18]
                    peer-checked:text-white hover:border-[#1e1c18]
                  "
                >
                  {ukuran}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {variants.map((variant) => (
            <div
              key={variant.key}
              className="grid md:grid-cols-5 gap-2 rounded-lg border border-[#eee] p-3"
            >
              <select
                value={variant.size}
                onChange={(e) =>
                  updateVariant(variant.key, "size", e.target.value)
                }
                className={inputClass}
              >
                <option value="">Ukuran</option>
                {UKURAN_LIST.map((ukuran) => (
                  <option key={ukuran} value={ukuran}>
                    {ukuran}
                  </option>
                ))}
                {variant.size &&
                  !UKURAN_LIST.some((ukuran) => ukuran === variant.size) && (
                    <option value={variant.size}>{variant.size}</option>
                  )}
              </select>
              <input
                placeholder="Warna"
                value={variant.color}
                onChange={(e) =>
                  updateVariant(variant.key, "color", e.target.value)
                }
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                placeholder="Stok"
                value={variant.stock}
                onChange={(e) =>
                  updateVariant(variant.key, "stock", e.target.value)
                }
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                placeholder="Tambahan harga"
                value={variant.extra_price}
                onChange={(e) =>
                  updateVariant(variant.key, "extra_price", e.target.value)
                }
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  setVariants((prev) =>
                    prev.filter((v) => v.key !== variant.key),
                  )
                }
                className="text-[12px] text-[#B23B3B]"
              >
                Hapus
              </button>
              <input
                placeholder="URL gambar varian"
                value={variant.image_url}
                onChange={(e) =>
                  updateVariant(variant.key, "image_url", e.target.value)
                }
                className={`${inputClass} md:col-span-6`}
              />
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-[13px] text-[#B23B3B]">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-5 rounded-lg bg-[#303030] hover:bg-[#8b6b5a] text-white text-[13px] font-semibold transition disabled:opacity-60"
        >
          {isPending ? "Menyimpan..." : "Simpan Produk"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="h-10 px-5 rounded-lg border border-[#d5d5d5] text-[13px]"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
