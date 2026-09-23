import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileSidebar from "@/components/profile/ProfileSidebar";

export default async function AccountLayout({
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

  const name = user.user_metadata?.full_name ?? "";
  const avatarUrl = user.user_metadata?.avatar_url ?? "";
  const inisial = name
    ? name.charAt(0).toUpperCase()
    : (user.email?.charAt(0).toUpperCase() ?? "?");

  const { data: profileRole } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profileRole?.role === "admin";

  return (
    <main
      className="bg-[#F8F8F8] text-[#1E1C18] min-h-screen pt-28 pb-20 relative"
      style={{ position: "relative", zIndex: 1, isolation: "isolate" }}
    >
      <div className="site-container">
        <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
          <aside className="md:sticky md:top-28">
            <ProfileSidebar
              email={user.email ?? ""}
              name={name}
              inisial={inisial}
              avatarUrl={avatarUrl}
              createdAt={user.created_at}
              isAdmin={isAdmin}
            />
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
