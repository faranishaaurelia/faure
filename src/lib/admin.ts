import { createClient } from "@/lib/supabase/server";

export async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tidak terautentikasi.", supabase: null as null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Akses ditolak.", supabase: null as null };
  }

  return { error: null, supabase };
}

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "produk";
}

export function rupiahAdmin(n: number) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}
