"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";
import {
  SELECT_OUTFIT_ITEMS,
  encodeKategoriOutfit,
  isOutfitKategori,
  resolveOutfitItem,
  type OutfitItemRow,
} from "@/lib/outfit-helpers";
import { revalidatePath } from "next/cache";

function revalidateOutfitPaths(outfitId?: number) {
  revalidatePath("/outfit");
  revalidatePath("/outfit-saya");
  if (outfitId) {
    revalidatePath(`/outfit/${outfitId}`);
    revalidatePath(`/outfit-saya/${outfitId}`);
  }
}

export type OutfitItemInput = {
  sumber: "toko" | "lemari"; // -> source_type 'product' | 'closet'
  variantId: number | null; // wajib diisi kalau sumber === "toko"
  closetItemId: number | null; // wajib diisi kalau sumber === "lemari"
  slot: string; // -> item_role
  xPercent: number; // -> pos_x
  yPercent: number; // -> pos_y
  scale: number;
  zIndex: number;
};

// =====================================================
// SIMPAN OUTFIT
// =====================================================
export async function saveOutfit(nama: string, items: OutfitItemInput[]) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.loginRequiredSaveOutfit") };
  }

  const namaBersih = nama.trim();
  if (!namaBersih) {
    return { error: t("errors.outfitNameRequired") };
  }

  if (items.length === 0) {
    return { error: t("errors.outfitEmpty") };
  }

  // Validasi sebelum insert, sesuai check constraint
  // outfit_items_source_consistency_check: source 'product' wajib punya
  // product_variant_id (dan tidak boleh punya closet_item_id), source
  // 'closet' wajib sebaliknya.
  const tidakValid = items.some((item) =>
    item.sumber === "toko" ? !item.variantId : !item.closetItemId,
  );
  if (tidakValid) {
    return {
      error: t("errors.variantRequired"),
    };
  }

  const { data: outfit, error } = await supabase
    .from("outfits")
    .insert({ user_id: user.id, name: namaBersih })
    .select("id")
    .single();

  if (error || !outfit) {
    return { error: t("errors.saveOutfitFail") };
  }

  const rows = items.map((item) => ({
    outfit_id: outfit.id,
    source_type: item.sumber === "toko" ? "product" : "closet",
    product_variant_id: item.sumber === "toko" ? item.variantId : null,
    closet_item_id: item.sumber === "lemari" ? item.closetItemId : null,
    item_role: item.slot,
    pos_x: item.xPercent,
    pos_y: item.yPercent,
    scale: item.scale,
    z_index: item.zIndex,
  }));

  const { error: errorItems } = await supabase
    .from("outfit_items")
    .insert(rows);

  if (errorItems) {
    // Rollback manual: hapus outfit yang baru dibuat kalau item gagal
    // disimpan, supaya tidak ada outfit kosong nyangkut di database.
    await supabase.from("outfits").delete().eq("id", outfit.id);
    console.error("Gagal menyimpan outfit_items:", errorItems.message);
    return { error: t("errors.saveItemFail") };
  }

  revalidateOutfitPaths(outfit.id as number);
  return { success: true, outfitId: outfit.id as number };
}

// =====================================================
// HAPUS OUTFIT
// =====================================================
export async function deleteOutfit(outfitId: number) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.loginRequired") };
  }

  const { error } = await supabase
    .from("outfits")
    .delete()
    .eq("id", outfitId)
    .eq("user_id", user.id);

  if (error) {
    return { error: t("errors.deleteOutfitFail") };
  }

  revalidateOutfitPaths(outfitId);
  return { success: true };
}

// =====================================================
// PUBLIKASIKAN / BATALKAN PUBLIKASI
// Jenis outfit disimpan di cover_image_url (prefix kategori:)
// karena kolom category belum ada di tabel outfits.
// =====================================================
export async function publishOutfit(outfitId: number, kategori: string) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.loginRequired") };
  }

  if (!isOutfitKategori(kategori)) {
    return { error: t("errors.outfitTypeInvalid") };
  }

  const { data: existing } = await supabase
    .from("outfits")
    .select("id")
    .eq("id", outfitId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return { error: t("errors.outfitNotFound") };
  }

  const { error } = await supabase
    .from("outfits")
    .update({
      is_public: true,
      cover_image_url: encodeKategoriOutfit(kategori),
    })
    .eq("id", outfitId)
    .eq("user_id", user.id);

  if (error) {
    return { error: t("errors.publishFail") };
  }

  revalidateOutfitPaths(outfitId);
  return { success: true };
}

export async function unpublishOutfit(outfitId: number) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.loginRequired") };
  }

  const { error } = await supabase
    .from("outfits")
    .update({ is_public: false })
    .eq("id", outfitId)
    .eq("user_id", user.id);

  if (error) {
    return { error: t("errors.unpublishFail") };
  }

  revalidateOutfitPaths(outfitId);
  return { success: true };
}

// Salin outfit publik orang lain ke profil user yang sedang login.
export async function savePublishedOutfit(outfitId: number) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.loginRequiredSaveOutfit") };
  }

  const admin = createAdminClient();
  const { data: sumber, error: errorSumber } = await admin
    .from("outfits")
    .select(`id, name, user_id, is_public, outfit_items ( ${SELECT_OUTFIT_ITEMS} )`)
    .eq("id", outfitId)
    .eq("is_public", true)
    .maybeSingle();

  if (errorSumber || !sumber) {
    return { error: t("errors.publicOutfitNotFound") };
  }

  if (sumber.user_id === user.id) {
    return { error: t("errors.alreadySaved") };
  }

  const itemsSumber = ((sumber.outfit_items ?? []) as unknown as OutfitItemRow[])
    .map(resolveOutfitItem)
    .filter((item) => item.variantId);

  if (itemsSumber.length === 0) {
    return { error: t("errors.noBuyableItem") };
  }

  const { data: outfit, error } = await supabase
    .from("outfits")
    .insert({
      user_id: user.id,
      name: sumber.name ?? t("outfit.savedOutfitFallback"),
      is_public: false,
    })
    .select("id")
    .single();

  if (error || !outfit) {
    return { error: t("errors.saveToProfileFail") };
  }

  const rows = itemsSumber.map((item) => ({
    outfit_id: outfit.id,
    source_type: "product",
    product_variant_id: item.variantId,
    closet_item_id: null,
    item_role: item.slot,
    pos_x: item.posX,
    pos_y: item.posY,
    scale: item.scale,
    z_index: item.zIndex,
  }));

  const { error: errorItems } = await supabase.from("outfit_items").insert(rows);

  if (errorItems) {
    await supabase.from("outfits").delete().eq("id", outfit.id);
    return { error: t("errors.saveItemFail") };
  }

  revalidateOutfitPaths(outfit.id as number);
  return { success: true, outfitId: outfit.id as number };
}

// =====================================================
// CHECKOUT OUTFIT (BUY-NOW UNTUK BEBERAPA VARIAN SEKALIGUS)
// =====================================================
// Dipakai tombol "Beli Semua Item Ini", baik langsung dari kanvas
// pembuatan outfit maupun dari halaman detail outfit yang sudah
// tersimpan. Setiap variant_id disiapkan sebagai 1 baris keranjang
// (qty minimal 1). Kalau variant itu sudah ada di keranjang, qty TIDAK
// ditambah (sama seperti checkoutNow di cart.ts) — supaya "Beli Semua
// Item Ini" tidak diam-diam menambah stok yang sudah dipesan user
// sebelumnya.
export async function checkoutOutfitBuyNow(variantIds: number[]) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.loginRequiredCheckout") };
  }

  const unik = [...new Set(variantIds)].filter(
    (id) => Number.isInteger(id) && id > 0,
  );

  if (unik.length === 0) {
    return {
      error: t("outfit.noVariant"),
    };
  }

  const hasil: { cartId: number; quantity: number }[] = [];

  for (const variantId of unik) {
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_variant_id", variantId)
      .maybeSingle();

    if (existing) {
      const qty = Math.max(1, Number(existing.quantity) || 1);
      hasil.push({ cartId: existing.id, quantity: qty });
      continue;
    }

    const { data: baru, error } = await supabase
      .from("cart_items")
      .insert({
        user_id: user.id,
        product_variant_id: variantId,
        quantity: 1,
      })
      .select("id")
      .single();

    if (error || !baru) {
      return { error: t("outfit.checkoutFail") };
    }

    hasil.push({ cartId: baru.id, quantity: 1 });
  }

  revalidatePath("/cart");
  return { success: true, items: hasil };
}
