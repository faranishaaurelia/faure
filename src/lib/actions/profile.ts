"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

type ActionState = { error: string | null; success?: boolean };

const GAMBAR_DIPERBOLEHKAN = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAKS_UKURAN_GAMBAR = 5 * 1024 * 1024; // 5 MB

export async function updateProfile(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const alamat = formData.get("alamat") as string;

  const supabase = await createClient();
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.profileUpdateRequired") };
  }

  const { error } = await supabase.auth.updateUser({
    email: email !== user.email ? email : undefined,
    data: {
      full_name: name,
      phone,
      alamat,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { error: null, success: true };
}

// Upload foto profil ke storage, lalu simpan URL-nya di metadata akun
// (user_metadata.avatar_url). Dipakai saat user mengganti foto profil dari
// halaman profil. File lama milik user dibersihkan setelah berhasil.
export async function uploadAvatar(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = formData.get("file");

  const { t } = await getT();

  if (!(raw instanceof File) || raw.size === 0) {
    return { error: t("errors.avatarFileRequired") };
  }

  if (!GAMBAR_DIPERBOLEHKAN.includes(raw.type)) {
    return {
      error: t("errors.avatarFormat"),
    };
  }

  if (raw.size > MAKS_UKURAN_GAMBAR) {
    return { error: t("errors.avatarTooLarge") };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("errors.profileUpdateRequired") };
  }

  const admin = createAdminClient();

  const folder = `avatars/${user.id}`;
  const ext = raw.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("product-images")
    .upload(path, raw, {
      cacheControl: "3600",
      upsert: false,
      contentType: raw.type,
    });

  if (uploadError) {
    return { error: t("errors.uploadFail", { message: uploadError.message }) };
  }

  const { data: publicData } = admin.storage
    .from("product-images")
    .getPublicUrl(path);

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...(user.user_metadata ?? {}),
      avatar_url: publicData.publicUrl,
    },
  });

  if (updateError) {
    // Kalau metadata gagal disimpan, hapus file baru supaya tidak nyangkut.
    await admin.storage.from("product-images").remove([path]);
    return { error: updateError.message };
  }

  // Bersihkan foto lama milik user ini (best-effort: kalau gagal, tidak apa-apa).
  const { data: existing } = await admin.storage
    .from("product-images")
    .list(folder, { limit: 100 });

  if (existing && existing.length > 0) {
    const lama = existing
      .map((f) => `${folder}/${f.name}`)
      .filter((f) => f !== path);

    if (lama.length > 0) {
      await admin.storage.from("product-images").remove(lama);
    }
  }

  revalidatePath("/profile");
  revalidatePath("/pesanan");
  revalidatePath("/lemari");

  return { error: null, success: true };
}

export async function updatePassword(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("password") as string;
  const confirmPassword = formData.get("password_confirmation") as string;

  const { t } = await getT();

  if (newPassword !== confirmPassword) {
    return { error: t("errors.confirmPasswordMismatch") };
  }
  if (newPassword.length < 8) {
    return { error: t("errors.newPasswordTooShort") };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: t("errors.profileUpdateRequired") };
  }

  // Verifikasi kata sandi lama dengan mencoba sign in ulang
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: t("errors.currentPasswordWrong") };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: t("errors.updatePasswordFail") };
  }

  return { error: null, success: true };
}
