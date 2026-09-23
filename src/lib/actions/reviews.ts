"use server";

import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

export type ReviewInput = {
  // Item pesanan yang diulas (dari halaman pesanan selesai atau item lemari).
  orderItemId: number;
  rating: number;
  comment: string;
};

export async function submitReview(input: ReviewInput) {
  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: t("errors.loginRequiredReview") };

  const rating = Math.round(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { error: t("errors.ratingRange") };
  }

  if (!Number.isInteger(input.orderItemId) || input.orderItemId <= 0) {
    return { error: t("errors.productInvalid") };
  }

  // Pastikan item ini benar-benar ada di lemari user, sekaligus ambil
  // product_id dari variannya. Jangan percaya product_id dari client.
  const { data: closet } = await supabase
    .from("closet_items")
    .select("id, product_variants ( product_id )")
    .eq("user_id", user.id)
    .eq("order_item_id", input.orderItemId)
    .maybeSingle();

  if (!closet) {
    return {
      error: t("errors.notReviewable"),
    };
  }

  const varian = Array.isArray(closet.product_variants)
    ? closet.product_variants[0]
    : closet.product_variants;
  const productId = varian?.product_id as number | undefined;

  if (!productId) {
    return { error: t("errors.productInvalid") };
  }

  // Sudah pernah mengulas produk ini? satu user hanya boleh satu ulasan per produk
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    return { error: t("errors.alreadyReviewed") };
  }

  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    product_id: productId,
    order_item_id: input.orderItemId,
    rating,
    comment: input.comment.trim() || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/produk/${productId}`);
  revalidatePath("/produk");
  revalidatePath("/lemari");
  revalidatePath("/pesanan");
  revalidatePath("/pesanan/[id]", "page");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/dashboard");

  return { error: null };
}