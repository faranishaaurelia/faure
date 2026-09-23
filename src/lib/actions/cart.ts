"use server";

import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

export async function updateCartQuantity(cartItemId: number, quantity: number) {
  const supabase = await createClient();
  const { t } = await getT();

  if (quantity < 1) {
    return removeCartItem(cartItemId);
  }

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", cartItemId);

  if (error) return { error: t("errors.updateQuantityFail") };

  revalidatePath("/cart");
  return { success: true };
}

export async function removeCartItem(cartItemId: number) {
  const supabase = await createClient();
  const { t } = await getT();

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId);

  if (error) return { error: t("errors.removeItemFail") };

  revalidatePath("/cart");
  return { success: true };
}

// "Checkout Sekarang" dari halaman detail produk (buy-now murni).
// Beda dengan addToCart: qty TIDAK ditambah ke qty yang sudah ada di
// keranjang. Baris keranjang hanya dipastikan punya qty >= yang dipilih,
// lalu checkout memakai jumlah persis sesuai pilihan user. Barang lain di
// keranjang tidak ikut serta.
export async function checkoutNow(variantId: number, quantity: number) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.loginRequiredCheckout") };
  }

  const jumlah = Math.max(1, Math.floor(quantity));

  // Cek apakah varian ini sudah ada di keranjang.
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("product_variant_id", variantId)
    .maybeSingle();

  if (existing) {
    // Jangan tambah-tambah: cukup pastikan qty keranjang mencukupi
    // jumlah yang dipilih, supaya checkout menampilkan qty yang benar.
    if (Number(existing.quantity) < jumlah) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: jumlah })
        .eq("id", existing.id);
      if (error) return { error: t("errors.prepareCheckoutFail") };
    }
    revalidatePath("/cart");
    return { success: true, cartId: existing.id, quantity: jumlah };
  }

  const { data: baru, error } = await supabase
    .from("cart_items")
    .insert({
      user_id: user.id,
      product_variant_id: variantId,
      quantity: jumlah,
    })
    .select("id")
    .single();
  if (error) return { error: t("errors.prepareCheckoutFail") };

  revalidatePath("/cart");
  return { success: true, cartId: baru?.id, quantity: jumlah };
}

export async function addToCart(variantId: number, quantity: number) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.loginRequiredCart") };
  }

  // Cek apakah item ini sudah ada di keranjang, kalau ada tinggal tambah jumlahnya
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("product_variant_id", variantId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id);
    if (error) return { error: t("errors.addToCartFail") };
    revalidatePath("/cart");
    return { success: true, cartId: existing.id };
  }

  const { data: baru, error } = await supabase
    .from("cart_items")
    .insert({
      user_id: user.id,
      product_variant_id: variantId,
      quantity,
    })
    .select("id")
    .single();
  if (error) return { error: t("errors.addToCartFail") };

  revalidatePath("/cart");
  return { success: true, cartId: baru?.id };
}
