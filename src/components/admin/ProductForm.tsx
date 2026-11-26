"use client";

import { useState, type ReactNode } from "react";
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
  image_url: string; // URL foto asli yang dipilih dari Foto Produk
};

type FormImage = {
  key: string;
  id?: number;
  url: string;
  cutout_url: string; // PNG transparan hasil remove background, "" kalau belum ada
};

const fieldClass = "block space-y-1.5 text-[12px] font-medium text-[#4A443E]";

const inputClass =
  "w-full h-11 rounded-xl border border-[#E7E5E0] bg-white px-3.5 text-[13px] text-[#1E1C18] placeholder:text-[#B0A89D] transition focus:border-[#8B6B5A] focus:outline-none focus:ring-1 focus:ring-[#8B6B5A]";

const inputClassSm =
  "w-full h-10 rounded-xl border border-[#E7E5E0] bg-white px-3 text-[13px] text-[#1E1C18] placeholder:text-[#B0A89D] transition focus:border-[#8B6B5A] focus:outline-none focus:ring-1 focus:ring-[#8B6B5A]";

const textareaClass =
  "w-full resize-y rounded-xl border border-[#E7E5E0] bg-white px-3.5 py-3 text-[13px] text-[#1E1C18] placeholder:text-[#B0A89D] transition focus:border-[#8B6B5A] focus:outline-none focus:ring-1 focus:ring-[#8B6B5A]";

const secondaryButtonClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E7E5E0] bg-white px-3.5 text-[12px] font-medium text-[#5F5953] transition hover:border-[#8B6B5A] hover:text-[#1E1C18]";

function SectionHeading({
  kicker,
  title,
  description,
  badge,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  badge?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#EFEAE4] px-5 py-5 sm:px-7">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7B69]">
          {kicker}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <h2 className="font-serif text-[22px] leading-none tracking-[-0.03em] text-[#1E1C18]">
            {title}
          </h2>
          {badge && (
            <span className="rounded-full bg-[#F7F3EE] px-2 py-0.5 text-[11px] font-medium text-[#8B6B5A]">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#8A837B]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

// Latar catur menandakan foto sudah punya versi transparan.
const checkerboardStyle = {
  backgroundImage:
    "linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
};

function emptyVariant(): FormVariant {
  return {
    key: crypto.randomUUID(),
    size: "",
    color: "",
    stock: "",
    extra_price: "",
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
  const [memprosesKeys, setMemprosesKeys] = useState<Set<string>>(new Set());
  const [bgError, setBgError] = useState<Record<string, string>>({});

  // Slug & SKU tidak lagi diisi manual. Slug dibuat otomatis dari nama
  // produk oleh server; SKU lama tetap dipertahankan supaya tidak hilang
  // saat produk yang sudah ada disimpan ulang.
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  // Merek tidak ditampilkan di form, tapi nilai lama tetap dipertahankan
  // saat produk yang sudah ada disimpan ulang.
  const brand = product?.brand ?? "";
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
      : [],
  );
  const [images, setImages] = useState<FormImage[]>(
    product?.images.length
      ? product.images.map((img) => ({
          key: String(img.id ?? crypto.randomUUID()),
          id: img.id,
          url: img.url,
          cutout_url: img.cutout_url ?? "",
        }))
      : [],
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
  const daftarFoto = images.filter((i) => i.url);

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
          stock: "",
          extra_price: contoh?.extra_price ?? "",
          sku: "",
          image_url: contoh?.image_url ?? "",
        },
      ];
    });
  }

  // Hapus satu foto produk. Varian yang memilih foto itu ikut dilepas
  // supaya tidak menunjuk ke foto yang sudah tidak ada.
  function hapusFoto(key: string) {
    const img = images.find((i) => i.key === key);
    setImages((prev) => prev.filter((item) => item.key !== key));
    if (img?.url) {
      setVariants((prev) =>
        prev.map((v) =>
          v.image_url === img.url ? { ...v, image_url: "" } : v,
        ),
      );
    }
  }

  // Ubah URL foto. Varian yang memilih URL lama ikut diperbarui.
  function ubahUrlFoto(key: string, urlBaru: string) {
    const img = images.find((i) => i.key === key);
    const urlLama = img?.url ?? "";

    setImages((prev) =>
      prev.map((item) => (item.key === key ? { ...item, url: urlBaru } : item)),
    );
    if (urlLama) {
      setVariants((prev) =>
        prev.map((v) =>
          v.image_url === urlLama ? { ...v, image_url: urlBaru } : v,
        ),
      );
    }
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

  // ===== Hapus background dari sebuah foto produk. Hasilnya disimpan di
  // cutout_url foto itu. Varian TIDAK diubah: varian tetap menyimpan URL
  // foto aslinya, dan halaman Buat Outfit otomatis mencari versi
  // transparannya lewat foto produk yang sama. =====
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
      images: images
        .filter((img) => img.url.trim())
        .map((img, index) => ({
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="admin-card overflow-hidden">
        <SectionHeading
          kicker="Langkah 1"
          title="Informasi produk"
          description="Detail dasar yang tampil di halaman produk."
        />

        <div className="grid gap-4 px-5 py-6 sm:px-7 md:grid-cols-2">
          <label className={fieldClass}>
            <span>Nama</span>
            <input
              required
              placeholder="Nama produk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
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
          <label className={fieldClass}>
            <span>Harga dasar</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#8A837B]">
                Rp
              </span>
              <input
                required
                type="number"
                min="0"
                placeholder="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </span>
          </label>
          <label className={fieldClass}>
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
          <label className={`${fieldClass} md:col-span-2`}>
            <span>Bahan</span>
            <input
              placeholder="Contoh: Katun combed 30s"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={`${fieldClass} md:col-span-2`}>
            <span>Deskripsi</span>
            <textarea
              rows={4}
              placeholder="Tulis deskripsi singkat produk..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={textareaClass}
            />
          </label>
        </div>
      </section>

      <section className="admin-card overflow-hidden">
        <SectionHeading
          kicker="Langkah 2"
          title="Foto produk"
          description="Foto pertama menjadi cover. Urutan galeri mengikuti urutan di bawah."
          badge={`${daftarFoto.length} foto`}
          action={
            <button
              type="button"
              onClick={() => setImages((prev) => [...prev, emptyImage()])}
              className={secondaryButtonClass}
            >
              <span aria-hidden="true" className="text-[15px] leading-none">
                +
              </span>
              Tambah URL
            </button>
          }
        />

        <div className="space-y-4 px-5 py-6 sm:px-7">
        {/* ===== UPLOAD DARI KOMPUTER ===== */}
        <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#DED7CE] bg-[#FBF9F6] px-5 py-8 text-center transition hover:border-[#8B6B5A] hover:bg-[#F8F5F0]">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            multiple
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files)}
            className="sr-only"
          />
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#1E1C18] text-lg text-white transition group-hover:bg-[#8B6B5A]">
            ↑
          </span>
          <span className="space-y-1">
            <span className="block text-[13px] font-semibold text-[#1E1C18]">
              {uploading ? "Mengupload gambar..." : "Upload foto dari komputer"}
            </span>
            <span className="block text-[11px] leading-5 text-[#8A8179]">
              Pilih satu atau beberapa gambar (JPG, PNG, WebP, AVIF, GIF — maks.
              5 MB per file). Urutan galeri mengikuti urutan foto di bawah.
            </span>
          </span>
        </label>

        {uploadStatus && (
          <p className="text-[12px] text-[#8B6B5A]">{uploadStatus}</p>
        )}
        {uploadError && (
          <p className="text-[12px] text-[#B23B3B]">{uploadError}</p>
        )}

        {images.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img, index) => {
              const sedangDiproses = memprosesKeys.has(img.key);
              const punyaFoto = Boolean(img.url);

              return (
                <div
                  key={img.key}
                  className="overflow-hidden rounded-xl border border-[#EBE7E1] bg-white"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#F7F5F2]">
                    {punyaFoto ? (
                      <div
                        className="h-full w-full"
                        style={img.cutout_url ? checkerboardStyle : undefined}
                      >
                        <img
                          src={img.cutout_url || img.url}
                          alt={`Pratinjau ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-[#aaa]">
                        Belum ada pratinjau
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-[#1E1C18]/85 px-2 py-0.5 text-[10px] font-semibold text-white">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="space-y-2.5 p-3">
                    <input
                      value={img.url}
                      onChange={(e) => ubahUrlFoto(img.key, e.target.value)}
                      placeholder={`URL foto ${index + 1}`}
                      className={inputClassSm}
                    />

                    <div className="flex items-center justify-between gap-2">
                      {!punyaFoto ? (
                        <span className="text-[11px] text-[#aaa]">
                          Isi URL atau upload foto
                        </span>
                      ) : img.cutout_url ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3a7d44]">
                          ✓ Tanpa background
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={sedangDiproses}
                          onClick={() => handleHapusBackground(img.key)}
                          className="h-8 rounded-lg border border-[#e3ddd5] px-3 text-[11px] font-medium text-[#8b6b5a] transition hover:border-[#1e1c18] hover:text-[#1e1c18] disabled:opacity-50"
                        >
                          {sedangDiproses ? "Memproses..." : "Hapus Background"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => hapusFoto(img.key)}
                        aria-label={`Hapus foto ${index + 1}`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#eee] text-[15px] leading-none text-[#B23B3B] transition hover:border-[#B23B3B] hover:bg-[#FDF3F3]"
                      >
                        ×
                      </button>
                    </div>

                    {bgError[img.key] && (
                      <p className="text-[11px] leading-4 text-[#B23B3B]">
                        {bgError[img.key]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {daftarFoto.length > 0 && (
          <p className="rounded-xl bg-[#F7F3EE] px-3.5 py-2.5 text-[11px] leading-5 text-[#8A837B]">
            Foto berlatar catur sudah punya versi tanpa background yang dipakai
            di halaman Buat Outfit.
          </p>
        )}
        </div>
      </section>

      <section className="admin-card overflow-hidden">
        <SectionHeading
          kicker="Langkah 3"
          title="Varian"
          description="Atur ukuran, warna, stok, dan foto tiap varian."
          badge={`${variants.length} varian`}
          action={
            <button
              type="button"
              onClick={() => setVariants((prev) => [...prev, emptyVariant()])}
              className={secondaryButtonClass}
            >
              <span aria-hidden="true" className="text-[15px] leading-none">
                +
              </span>
              Tambah Varian
            </button>
          }
        />

        <div className="space-y-4 px-5 py-6 sm:px-7">
        {/* CHECKLIST UKURAN */}
        <div className="rounded-xl border border-[#EFEDE8] bg-[#FBF9F6] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-medium text-[#4A443E]">
              Ukuran tersedia
            </p>
            <p className="text-[11px] text-[#8A8179]">
              Centang untuk membuat varian otomatis
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {UKURAN_LIST.map((ukuran) => (
              <label key={ukuran} className="relative cursor-pointer">
                <input
                  type="checkbox"
                  checked={ukuranDipilih.has(ukuran)}
                  onChange={() => toggleUkuran(ukuran)}
                  className="sr-only peer"
                />
                <span className="flex h-8 min-w-11 items-center justify-center rounded-full border border-[#E4DFD8] bg-white px-3 text-[12px] text-[#5F5953] transition peer-checked:border-[#1E1C18] peer-checked:bg-[#1E1C18] peer-checked:text-white hover:border-[#8B6B5A]">
                  {ukuran}
                </span>
              </label>
            ))}
          </div>
        </div>

        {variants.length === 0 ? (
          <div className="rounded-xl border border-[#EFEDE8] bg-[#FBF9F6] px-5 py-8 text-center">
            <p className="text-[13px] font-medium text-[#1E1C18]">
              Belum ada varian
            </p>
            <p className="mt-1 text-[11px] text-[#8A837B]">
              Pilih ukuran di atas atau tekan Tambah Varian.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div
                key={variant.key}
                className="rounded-2xl border border-[#EFEAE4] bg-white p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[12px] font-medium text-[#4A443E]">
                    Varian {index + 1}
                    {variant.size ? (
                      <span className="ml-2 rounded-full bg-[#F7F3EE] px-2 py-0.5 text-[11px] text-[#8B6B5A]">
                        {variant.size}
                      </span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setVariants((prev) =>
                        prev.filter((v) => v.key !== variant.key),
                      )
                    }
                    aria-label={`Hapus varian ${index + 1}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#EEE] text-[15px] leading-none text-[#B23B3B] transition hover:border-[#B23B3B] hover:bg-[#FDF3F3]"
                  >
                    ×
                  </button>
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
                  <label className={fieldClass}>
                    <span>Ukuran</span>
                    <select
                      value={variant.size}
                      onChange={(e) =>
                        updateVariant(variant.key, "size", e.target.value)
                      }
                      className={`${inputClassSm} ${
                        variant.size ? "" : "text-[#B0A89D]"
                      }`}
                    >
                      <option value="">Pilih ukuran</option>
                      {UKURAN_LIST.map((ukuran) => (
                        <option key={ukuran} value={ukuran}>
                          {ukuran}
                        </option>
                      ))}
                      {variant.size &&
                        !UKURAN_LIST.some(
                          (ukuran) => ukuran === variant.size,
                        ) && <option value={variant.size}>{variant.size}</option>}
                    </select>
                  </label>
                  <label className={fieldClass}>
                    <span>Warna</span>
                    <input
                      placeholder="Contoh: Hitam"
                      value={variant.color}
                      onChange={(e) =>
                        updateVariant(variant.key, "color", e.target.value)
                      }
                      className={inputClassSm}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Stok</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={variant.stock}
                      onChange={(e) =>
                        updateVariant(variant.key, "stock", e.target.value)
                      }
                      className={inputClassSm}
                    />
                  </label>
                  <label className={fieldClass}>
                    <span>Tambahan harga</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={variant.extra_price}
                      onChange={(e) =>
                        updateVariant(variant.key, "extra_price", e.target.value)
                      }
                      className={inputClassSm}
                    />
                  </label>
                </div>

                {/* ===== FOTO VARIAN: dipilih dari Foto Produk ===== */}
                <div className="mt-4 border-t border-[#F3F1EC] pt-3">
                  <p className="mb-2 text-[12px] font-medium text-[#4A443E]">
                    Foto varian
                  </p>
                  {daftarFoto.length === 0 ? (
                    <p className="text-[11px] text-[#8A837B]">
                      Tambahkan foto di bagian Foto produk dulu.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {daftarFoto.map((img, idx) => {
                        const dipilih = variant.image_url === img.url;

                        return (
                          <button
                            key={img.key}
                            type="button"
                            onClick={() =>
                              updateVariant(
                                variant.key,
                                "image_url",
                                dipilih ? "" : img.url,
                              )
                            }
                            aria-label={`Pilih foto ${idx + 1} untuk varian ${index + 1}`}
                            aria-pressed={dipilih}
                            className={`relative h-14 w-14 overflow-hidden rounded-xl border-2 transition ${
                              dipilih
                                ? "border-[#1E1C18]"
                                : "border-[#EEE] hover:border-[#8B6B5A]"
                            }`}
                          >
                            <img
                              src={img.cutout_url || img.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            {dipilih && (
                              <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-tl-md bg-[#1E1C18] text-[10px] font-semibold text-white">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-[#F2D9D9] bg-[#FDF5F5] px-4 py-3 text-[12px] text-[#B23B3B]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-black/5 bg-white p-3">
        <p className="px-2 text-[12px] text-[#8A837B]">
          Pastikan foto dan varian sudah sesuai sebelum disimpan.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="inline-flex h-10 items-center rounded-full border border-[#E7E5E0] px-4 text-[13px] font-medium text-[#5F5953] transition hover:border-[#8B6B5A] hover:text-[#1E1C18]"
          >
            Batal
          </button>
          <button type="submit" disabled={isPending} className="admin-btn disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? "Menyimpan..." : "Simpan Produk"}
          </button>
        </div>
      </div>
    </form>
  );
}
