import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { count: refundMenunggu }, { count: chatUnread }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("refund_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      // Pesan dari pelanggan yang belum dibaca admin.
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false)
        .neq("sender_id", user.id),
    ]);

  return (
    <div className="min-h-screen flex bg-[#F7F3EE] text-[#1E1C18]">
      <AdminSidebar
        displayName={profile?.full_name ?? user.email ?? "Admin"}
        refundPending={refundMenunggu ?? 0}
        chatUnread={chatUnread ?? 0}
      />
      <main className="flex-1 min-w-0 px-6 md:px-10 py-8">{children}</main>
    </div>
  );
}
