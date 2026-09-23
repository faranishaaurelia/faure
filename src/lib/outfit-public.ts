import { createAdminClient } from "@/lib/supabase/admin";
import {
  SELECT_OUTFIT_ITEMS,
  handlePengguna,
  kategoriDariCover,
  resolveOutfitItem,
  type OutfitItemRow,
  type OutfitItemTampil,
  type OutfitKategori,
} from "@/lib/outfit-helpers";

// Nilai fallback bawaan (bahasa Indonesia) yang dipakai saat nama
// outfit / nama pembuat kosong. Halaman bisa membandingkan nilai ini
// lalu menggantinya dengan terjemahan sesuai locale aktif.
export const FALLBACK_OUTFIT_NAME = "Outfit tanpa nama";
export const FALLBACK_PEMBUAT = "Pengguna Faure";

export type OutfitPublik = {
  id: number;
  name: string;
  kategori: OutfitKategori | null;
  pembuatNama: string;
  pembuatHandle: string;
  items: OutfitItemTampil[];
  created_at: string;
  userId: string;
};

type OutfitPublikRow = {
  id: number;
  name: string | null;
  user_id: string;
  is_public: boolean;
  cover_image_url: string | null;
  created_at: string;
  outfit_items: OutfitItemRow[] | null;
};

export async function getPublicOutfits(): Promise<OutfitPublik[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("outfits")
    .select(
      `id, name, user_id, is_public, cover_image_url, created_at, outfit_items ( ${SELECT_OUTFIT_ITEMS} )`,
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Gagal fetch outfit publik:", error?.message);
    return [];
  }

  const rows = data as unknown as OutfitPublikRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id))];

  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };

  const namaMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null }) => [
      p.id,
      p.full_name,
    ]),
  );

  return rows.map((row) => toOutfitPublik(row, namaMap.get(row.user_id) ?? null));
}

export async function getPublicOutfitById(
  id: number,
): Promise<OutfitPublik | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("outfits")
    .select(
      `id, name, user_id, is_public, cover_image_url, created_at, outfit_items ( ${SELECT_OUTFIT_ITEMS} )`,
    )
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as OutfitPublikRow;
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", row.user_id)
    .maybeSingle();

  return toOutfitPublik(row, profile?.full_name ?? null);
}

function toOutfitPublik(
  row: OutfitPublikRow,
  fullName: string | null,
): OutfitPublik {
  const nama = fullName?.trim() || FALLBACK_PEMBUAT;
  return {
    id: row.id,
    name: row.name?.trim() || FALLBACK_OUTFIT_NAME,
    kategori: kategoriDariCover(row.cover_image_url),
    pembuatNama: nama,
    pembuatHandle: handlePengguna(nama),
    items: (row.outfit_items ?? []).map(resolveOutfitItem),
    created_at: row.created_at,
    userId: row.user_id,
  };
}
