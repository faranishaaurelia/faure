"use server";

import { revalidatePath } from "next/cache";
import { getAdminClient, slugify } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { statusDbValue, infoStatus } from "@/lib/orders";
import { restoreOrderStock } from "@/lib/stock";

export type VariantInput = {
  id?: number;
  size: string;
  color: string;
  stock: number;
  extra_price: number;
  sku: string;
  image_url: string;
};

export type ImageInput = {
  id?: number;
  url: string;
  cutout_url?: string | null; // PNG transparan hasil remove background
  sort_order: number;
};

export type ProductInput = {
  id?: number;
  name: string;
  slug?: string;
  description: string;
  brand: string;
  gender: string;
  material: string;
  category_id: number;
  base_price: number;
  variants: VariantInput[];
  images: ImageInput[];
};

function revalidateStore() {
  revalidatePath("/produk");
  revalidatePath("/admin/products");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/users");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/outfit");
  revalidatePath("/outfit/buat");
}

export async function updateOrderStatus(orderId: number, newStatus: string) {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error };

  const supabase = auth.supabase;

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("user_id, status, cancellation_reason")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return { error: "Pesanan tidak ditemukan." };
  }

  // Terjemahkan kunci tampilan ("menunggu_pembayaran") ke nilai yang
  // diterima check constraint kolom orders.status ("pending").
  const statusDb = statusDbValue(newStatus);
  if (!statusDb) {
    return { error: "Status pesanan tidak valid." };
  }

  const prevStatusKey = infoStatus(order.status).key;
  if (prevStatusKey === "dibatalkan") {
    return { error: "Pesanan yang sudah dibatalkan tidak dapat diubah statusnya." };
  }

  const updatedAt = new Date().toISOString();
  const payload: Record<string, string | null> = {
    status: statusDb,
    updated_at: updatedAt,
  };

  const admin = createAdminClient();
  let affectedProductIds: number[] = [];

  // Kalau admin membatalkan pesanan, catat waktu & siapa yang membatalkan
  // (kolom cancelled_by bertipe uuid → simpan ID admin).
  if (statusDb === "dibatalkan") {
    payload.cancelled_at = updatedAt;
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();
    payload.cancelled_by = adminUser?.id ?? null;
    if (!order.cancellation_reason) {
      payload.cancellation_reason = "Dibatalkan oleh admin";
    }
  }

  // Pulihkan stok HANYA kalau status benar-benar berubah ke dibatalkan.
  // Update bersyarat mencegah pemulihan ganda saat ada pembatalan paralel.
  const { data: updated, error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", orderId)
    .neq("status", "dibatalkan")
    .select("id");

  if (error) {
    return { error: error.message };
  }

  if (!updated || updated.length === 0) {
    return { error: "Pesanan ini sudah dibatalkan." };
  }

  if (statusDb === "dibatalkan") {
    affectedProductIds = await restoreOrderStock(orderId, admin);
  }

  if (statusDb === "selesai") {
    // Tulis item lemari pakai service-role client: RLS memblokir INSERT
    // closet_items dari sesi user (termasuk admin), jadi error-nya dulu
    // hilang diam-diam dan item tidak pernah masuk lemari.
    const { data: items } = await admin
      .from("order_items")
      .select("id, product_variant_id")
      .eq("order_id", orderId);

    if (items && items.length > 0) {
      const { data: existing } = await admin
        .from("closet_items")
        .select("order_item_id")
        .in(
          "order_item_id",
          items.map((i) => i.id),
        );

      const existingIds = new Set(existing?.map((e) => e.order_item_id) ?? []);

      const toInsert = items
        .filter((item) => !existingIds.has(item.id))
        .map((item) => ({
          user_id: order.user_id,
          product_variant_id: item.product_variant_id,
          order_item_id: item.id,
        }));

      if (toInsert.length > 0) {
        const { error: closetError } = await admin
          .from("closet_items")
          .insert(toInsert);
        if (closetError) return { error: closetError.message };
      }
    }
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/products");
  revalidatePath("/pesanan");
  revalidatePath(`/pesanan/${orderId}`);
  revalidatePath("/lemari");
  revalidatePath("/produk");
  revalidatePath("/produk/[id]", "page");
  for (const pid of affectedProductIds) {
    revalidatePath(`/produk/${pid}`);
  }

  return { error: null };
}

export async function updateOrderTracking(
  orderId: number,
  trackingNumber: string,
) {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error };

  const { error } = await auth.supabase
    .from("orders")
    .update({
      tracking_number: trackingNumber.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { error: null };
}

async function uniqueSlug(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminClient>>["supabase"]>,
  name: string,
  preferred?: string,
  excludeId?: number,
) {
  const base = slugify(preferred || name);
  let candidate = base;
  let n = 1;

  while (true) {
    let query = supabase.from("products").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function saveProduct(input: ProductInput) {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error, id: null };

  const supabase = auth.supabase;
  const name = input.name.trim();

  if (!name) return { error: "Nama produk wajib diisi.", id: null };
  if (!input.category_id) return { error: "Kategori wajib dipilih.", id: null };
  if (!Number.isFinite(input.base_price) || input.base_price < 0) {
    return { error: "Harga dasar tidak valid.", id: null };
  }

  const slug = await uniqueSlug(supabase, name, input.slug, input.id);

  const productRow = {
    name,
    slug,
    description: input.description.trim() || null,
    brand: input.brand.trim() || null,
    gender: input.gender.trim() || null,
    material: input.material.trim() || null,
    category_id: input.category_id,
    base_price: input.base_price,
  };

  let productId = input.id ?? null;

  if (productId) {
    const { error } = await supabase
      .from("products")
      .update(productRow)
      .eq("id", productId);

    if (error) return { error: error.message, id: null };
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert(productRow)
      .select("id")
      .single();

    if (error || !data)
      return { error: error?.message ?? "Gagal membuat produk.", id: null };
    productId = data.id;
  }

  const variants = input.variants.filter(
    (v) =>
      v.size.trim() ||
      v.color.trim() ||
      v.sku.trim() ||
      v.image_url.trim() ||
      v.stock > 0,
  );

  const { data: existingVariants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  const keepVariantIds = new Set(
    variants.map((v) => v.id).filter((id): id is number => Boolean(id)),
  );
  const deleteVariantIds = (existingVariants ?? [])
    .map((v) => v.id)
    .filter((id) => !keepVariantIds.has(id));

  if (deleteVariantIds.length > 0) {
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .in("id", deleteVariantIds);

    if (error) {
      return {
        error: `Produk tersimpan, tapi varian tidak bisa dihapus: ${error.message}`,
        id: productId,
      };
    }
  }

  for (const variant of variants) {
    const row = {
      product_id: productId,
      size: variant.size.trim() || null,
      color: variant.color.trim() || null,
      stock: Number.isFinite(variant.stock)
        ? Math.max(0, Math.floor(variant.stock))
        : 0,
      extra_price: Number.isFinite(variant.extra_price)
        ? variant.extra_price
        : 0,
      sku: variant.sku.trim() || null,
      image_url: variant.image_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (variant.id) {
      const { error } = await supabase
        .from("product_variants")
        .update(row)
        .eq("id", variant.id);
      if (error) return { error: error.message, id: productId };
    } else {
      const { error } = await supabase.from("product_variants").insert(row);
      if (error) return { error: error.message, id: productId };
    }
  }

  const images = input.images.filter((img) => img.url.trim());
  const { data: existingImages } = await supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId);

  const keepImageIds = new Set(
    images.map((img) => img.id).filter((id): id is number => Boolean(id)),
  );
  const deleteImageIds = (existingImages ?? [])
    .map((img) => img.id)
    .filter((id) => !keepImageIds.has(id));

  if (deleteImageIds.length > 0) {
    await supabase.from("product_images").delete().in("id", deleteImageIds);
  }

  for (const [index, image] of images.entries()) {
    const row = {
      product_id: productId,
      url: image.url.trim(),
      cutout_url: image.cutout_url?.trim() || null,
      sort_order: image.sort_order ?? index,
      variant_id: null,
    };

    if (image.id) {
      const { error } = await supabase
        .from("product_images")
        .update(row)
        .eq("id", image.id);
      if (error) return { error: error.message, id: productId };
    } else {
      const { error } = await supabase.from("product_images").insert(row);
      if (error) return { error: error.message, id: productId };
    }
  }

  revalidateStore();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/produk/${productId}`);

  return { error: null, id: productId };
}

export async function deleteProduct(productId: number) {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error };

  const supabase = auth.supabase;

  await supabase.from("reviews").delete().eq("product_id", productId);
  await supabase.from("product_images").delete().eq("product_id", productId);

  const { error: variantError } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);

  if (variantError) {
    // Varian produk masih dipakai order_items / cart_items / closet_items /
    // outfit_items (FK RESTRICT), jadi hapus permanen dilarang database.
    // Nonaktifkan saja: produk disembunyikan dari toko & dashboard admin,
    // tapi riwayat pesanan yang lama tetap utuh.
    const { error: deactivateError } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", productId);

    if (deactivateError) {
      return { error: "Produk tidak bisa dihapus maupun dinonaktifkan." };
    }

    revalidateStore();
    return {
      error: null,
      note: "Produk tidak bisa dihapus permanen karena masih dipakai pesanan/keranjang lama. Produk dinonaktifkan dan disembunyikan dari toko.",
    };
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);
  if (error) {
    return {
      error: "Produk tidak bisa dihapus karena masih terkait data lain.",
    };
  }

  revalidateStore();
  return { error: null };
}

export async function saveCategory(input: { id?: number; name: string }) {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error };

  const name = input.name.trim();
  if (!name) return { error: "Nama kategori wajib diisi." };

  if (input.id) {
    const { error } = await auth.supabase
      .from("categories")
      .update({ name })
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await auth.supabase.from("categories").insert({ name });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/produk");
  revalidatePath("/admin/products");
  return { error: null };
}

export async function deleteCategory(id: number) {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error };

  const { error } = await auth.supabase
    .from("categories")
    .delete()
    .eq("id", id);
  if (error) {
    return {
      error: "Kategori tidak bisa dihapus karena masih dipakai produk.",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/produk");
  revalidatePath("/admin/products");
  return { error: null };
}

export async function deleteReview(id: number) {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error };

  const { error } = await auth.supabase.from("reviews").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/reviews");
  revalidatePath("/admin/dashboard");
  revalidatePath("/produk");
  return { error: null };
}

export async function deleteUser(userId: string) {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error };

  if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return { error: "ID pengguna tidak valid." };
  }

  const {
    data: { user: adminUser },
  } = await auth.supabase.auth.getUser();

  if (adminUser?.id === userId) {
    return { error: "Tidak bisa menghapus akun sendiri." };
  }

  const { data: target } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return { error: "Pengguna tidak ditemukan." };

  if (String(target.role ?? "").toLowerCase() === "admin") {
    return { error: "Akun admin tidak bisa dihapus." };
  }

  // Hapus dari Auth (service role) agar profil & data terkait ikut terhapus
  // lewat aturan cascade di database, bukan cuma baris profiles-nya.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    return {
      error:
        "Pengguna tidak bisa dihapus. Pastikan tidak ada data terkait (pesanan, alamat, atau outfit) yang masih memakai akun ini.",
    };
  }

  revalidateStore();
  revalidatePath("/admin/chat");
  return { error: null };
}

const GAMBAR_DIPERBOLEHKAN = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];
const MAKS_UKURAN_GAMBAR = 5 * 1024 * 1024; // 5 MB

// Upload gambar produk ke bucket "product-images", dikembalikan URL publiknya.
// Hanya boleh dipanggil admin. Dipakai formulir produk (upload dari komputer,
// termasuk upload versi PNG transparan hasil remove background).
export async function uploadProductImage(formData: FormData) {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error, url: null };

  const raw = formData.get("file");
  if (!(raw instanceof File)) {
    return { error: "Tidak ada file yang dipilih.", url: null };
  }

  if (!GAMBAR_DIPERBOLEHKAN.includes(raw.type)) {
    return {
      error: "Format gambar harus JPG, PNG, WebP, AVIF, atau GIF.",
      url: null,
    };
  }

  if (raw.size > MAKS_UKURAN_GAMBAR) {
    return { error: "Ukuran gambar maksimal 5 MB.", url: null };
  }

  const ext = raw.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `produk/${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("product-images")
    .upload(path, raw, {
      cacheControl: "3600",
      upsert: false,
      contentType: raw.type,
    });

  if (uploadError) {
    return {
      error: `Gagal mengupload gambar: ${uploadError.message}`,
      url: null,
    };
  }

  const { data } = admin.storage.from("product-images").getPublicUrl(path);

  return { error: null, url: data.publicUrl };
}

// =====================================================
// PENGAJUAN REFUND
// =====================================================

// Admin menyetujui / menolak pengajuan pengembalian dana. Saat disetujui,
// payment_status pesanan diubah jadi "dikembalikan".
export async function reviewRefund(
  refundId: number,
  approve: boolean,
): Promise<{ error: string | null }> {
  const auth = await getAdminClient();
  if (auth.error || !auth.supabase) return { error: auth.error };

  const supabase = auth.supabase;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: refund, error: fetchError } = await supabase
    .from("refund_requests")
    .select("id, order_id, user_id, status")
    .eq("id", refundId)
    .single();

  if (fetchError || !refund) {
    return { error: "Pengajuan refund tidak ditemukan." };
  }

  if (refund.status !== "pending") {
    return { error: "Pengajuan ini sudah direview sebelumnya." };
  }

  const now = new Date().toISOString();
  const statusBaru = approve ? "approved" : "rejected";

  // Tulis pakai service-role: RLS tabel refund_requests bisa memblokir
  // update dari sesi user (termasuk admin). Verifikasi admin sudah lewat
  // getAdminClient di atas.
  const admin = createAdminClient();

  const { error } = await admin
    .from("refund_requests")
    .update({
      status: statusBaru,
      reviewed_by: user?.id ?? null,
      reviewed_at: now,
    })
    .eq("id", refundId);

  if (error) return { error: error.message };

  if (approve) {
    const { error: orderError } = await admin
      .from("orders")
      .update({
        payment_status: "dikembalikan",
        updated_at: now,
      })
      .eq("id", refund.order_id);

    if (orderError) return { error: orderError.message };
  }

  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/orders/${refund.order_id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/pesanan/${refund.order_id}`);
  revalidatePath("/pesanan");

  return { error: null };
}
