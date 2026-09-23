"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { validateAddress, type AddressInput } from "@/lib/addresses";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// -----------------------------------------------------
// Tambah / ubah alamat
//
// Kalau alamat yang diubah sudah pernah dipakai di pesanan,
// alamat lama diarsipkan dan dibuat baris baru. Dengan begitu
// alamat di pesanan lama tidak ikut berubah.
// -----------------------------------------------------
export async function saveAddress(input: AddressInput): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  const { t } = await getT();
  if (!user) return { ok: false, error: t("errors.sessionExpired") };

  if (Object.keys(validateAddress(input, t)).length > 0) {
    return { ok: false, error: t("errors.checkAddress") };
  }

  const payload = {
    label: input.label.trim() || null,
    recipient_name: input.recipient_name.trim(),
    phone: input.phone.replace(/[\s-]/g, ""),
    full_address: input.full_address.trim(),
    city: input.city.trim(),
    province: input.province.trim(),
    postal_code: input.postal_code.trim(),
    notes: input.notes.trim() || null,
  };

  let jadikanUtama = input.is_default;
  let dipakaiPesanan = false;

  if (input.id) {
    const { data: lama } = await supabase
      .from("addresses")
      .select("is_default")
      .eq("id", input.id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (!lama) return { ok: false, error: t("errors.addressMissing") };

    // Alamat utama tidak bisa "dicopot" langsung, harus pilih alamat lain
    if (lama.is_default) jadikanUtama = true;

    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("address_id", input.id)
      .eq("user_id", user.id);

    dipakaiPesanan = (count ?? 0) > 0;
  } else {
    const { count } = await supabase
      .from("addresses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("deleted_at", null);

    // Alamat pertama otomatis jadi alamat utama
    if ((count ?? 0) === 0) jadikanUtama = true;
  }

  if (jadikanUtama) {
    const { error } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true)
      .is("deleted_at", null);

    if (error) {
      console.error("Gagal reset alamat utama:", error.message);
      return { ok: false, error: t("errors.generic") };
    }
  }

  // Ubah langsung (belum pernah dipakai di pesanan)
  if (input.id && !dipakaiPesanan) {
    const { error } = await supabase
      .from("addresses")
      .update({ ...payload, is_default: jadikanUtama })
      .eq("id", input.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Gagal ubah alamat:", error.message);
      return { ok: false, error: t("errors.generic") };
    }
  } else {
    // Alamat baru, atau salinan baru dari alamat yang sudah dipakai pesanan
    const { error } = await supabase
      .from("addresses")
      .insert({ ...payload, user_id: user.id, is_default: jadikanUtama });

    if (error) {
      console.error("Gagal simpan alamat:", error.message);
      return { ok: false, error: t("errors.generic") };
    }

    if (input.id) {
      const { error: arsipError } = await supabase
        .from("addresses")
        .update({ deleted_at: new Date().toISOString(), is_default: false })
        .eq("id", input.id)
        .eq("user_id", user.id);

      if (arsipError) {
        console.error("Gagal arsip alamat lama:", arsipError.message);
        return { ok: false, error: t("errors.generic") };
      }
    }
  }

  revalidatePath("/profile");
  return { ok: true };
}

// -----------------------------------------------------
// Hapus alamat (diarsipkan, bukan dihapus permanen,
// karena tabel orders masih menyimpan address_id)
// -----------------------------------------------------
export async function deleteAddress(id: number): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  const { t } = await getT();
  if (!user) return { ok: false, error: t("errors.sessionExpired") };

  const { data: lama } = await supabase
    .from("addresses")
    .select("is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!lama) return { ok: false, error: t("errors.addressMissing") };

  const { error } = await supabase
    .from("addresses")
    .update({ deleted_at: new Date().toISOString(), is_default: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Gagal hapus alamat:", error.message);
    return { ok: false, error: t("errors.generic") };
  }

  // Kalau yang dihapus alamat utama, alamat terbaru berikutnya jadi utama
  if (lama.is_default) {
    const { data: berikutnya } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (berikutnya) {
      await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", berikutnya.id)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/profile");
  return { ok: true };
}

// -----------------------------------------------------
// Jadikan alamat utama
// -----------------------------------------------------
export async function setDefaultAddress(id: number): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  const { t } = await getT();
  if (!user) return { ok: false, error: t("errors.sessionExpired") };

  const { error: resetError } = await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", user.id)
    .eq("is_default", true)
    .is("deleted_at", null);

  if (resetError) {
    console.error("Gagal reset alamat utama:", resetError.message);
    return { ok: false, error: t("errors.generic") };
  }

  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("Gagal set alamat utama:", error.message);
    return { ok: false, error: t("errors.generic") };
  }

  revalidatePath("/profile");
  return { ok: true };
}
