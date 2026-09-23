import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/profile/ProfileForm";
import PasswordForm from "@/components/profile/PasswordForm";
import AddressBook from "@/components/profile/AddressBook";
import type { Address } from "@/lib/addresses";
import { getT } from "@/lib/i18n/server";

export default async function ProfilePage() {
  const { t } = await getT();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata?.full_name ?? "";
  const phone = user.user_metadata?.phone ?? "";
  const alamat = user.user_metadata?.alamat ?? "";

  const [
    { count: jumlahPesanan },
    { count: jumlahLemari },
    { count: jumlahOutfit },
    { count: jumlahChat },
    { data: alamatData },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("closet_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("outfits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("context_type", "product")
      .not("last_message_at", "is", null),
    supabase
      .from("addresses")
      .select(
        "id, label, recipient_name, phone, full_address, city, province, postal_code, notes, is_default",
      )
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const daftarAlamat = (alamatData ?? []) as Address[];

  return (
    <div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Link
            href="/pesanan"
            className="group bg-white rounded-[20px] border border-black/5 shadow-sm p-4 text-center transition hover:border-[#1E1C18]/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#1E1C18]"
          >
            <p className="text-2xl font-bold text-[#1E1C18]">
              {jumlahPesanan ?? 0}
            </p>
            <p className="text-xs text-[#8B8478] mt-1">{t("account.myOrders")}</p>
            <p className="mt-2 text-[10px] font-medium text-[#1E1C18] opacity-60 group-hover:opacity-100 transition">
              {t("account.viewOrders")}
            </p>
          </Link>
          <Link
            href="/lemari"
            className="group bg-white rounded-[20px] border border-black/5 shadow-sm p-4 text-center transition hover:border-[#1E1C18]/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#1E1C18]"
          >
            <p className="text-2xl font-bold text-[#1E1C18]">
              {jumlahLemari ?? 0}
            </p>
            <p className="text-xs text-[#8B8478] mt-1">{t("account.closetItems")}</p>
            <p className="mt-2 text-[10px] font-medium text-[#1E1C18] opacity-60 group-hover:opacity-100 transition">
              {t("account.openCloset")}
            </p>
          </Link>
          <Link
            href="/outfit-saya"
            className="group bg-white rounded-[20px] border border-black/5 shadow-sm p-4 text-center transition hover:border-[#1E1C18]/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#1E1C18]"
          >
            <p className="text-2xl font-bold text-[#1E1C18]">
              {jumlahOutfit ?? 0}
            </p>
            <p className="text-xs text-[#8B8478] mt-1">{t("account.savedOutfits")}</p>
            <p className="mt-2 text-[10px] font-medium text-[#1E1C18] opacity-60 group-hover:opacity-100 transition">
              {t("account.viewOutfits")}
            </p>
          </Link>
          <Link
            href="/chat"
            className="group bg-white rounded-[20px] border border-black/5 shadow-sm p-4 text-center transition hover:border-[#1E1C18]/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#1E1C18]"
          >
            <p className="text-2xl font-bold text-[#1E1C18]">
              {jumlahChat ?? 0}
            </p>
            <p className="text-xs text-[#8B8478] mt-1">{t("account.chatItems")}</p>
            <p className="mt-2 text-[10px] font-medium text-[#1E1C18] opacity-60 group-hover:opacity-100 transition">
              {t("account.viewChat")}
            </p>
          </Link>
          <div className="bg-white rounded-[20px] border border-black/5 shadow-sm p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-[#1E1C18]">
              {daftarAlamat.length}
            </p>
            <p className="text-xs text-[#8B8478] mt-1">{t("account.addresses")}</p>
          </div>
        </div>

        <ProfileForm
          name={name}
          email={user.email ?? ""}
          phone={phone}
          alamat={alamat}
        />

        <AddressBook
          addresses={daftarAlamat}
          defaultName={name}
          defaultPhone={phone}
        />

        <PasswordForm />
      </div>
    </div>
  );
}
