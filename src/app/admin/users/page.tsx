import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTanggal } from "@/lib/orders";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import DeleteUserButton from "@/components/admin/DeleteUserButton";

const styleSvg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IKON = {
  pengguna: (
    <svg {...styleSvg}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.4 4.4-5.5 7.5-5.5s6.1 2.1 7.5 5.5" />
    </svg>
  ),
  admin: (
    <svg {...styleSvg}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 19c1-3 3.5-5 7-5s6 2 7 5" />
      <path d="M12 2.5l2 1.3 2.3-.3.7 2.2 1.9 1.4-.7 2.2 1.2 2-2 1.4-.7 2.2-2.3-.3-2 1.3-2-1.3-2.3.3-.7-2.2-2-1.4.7-2.2-1.2-2 2-1.4.7-2.2 2.3.3z" />
      <circle cx="12" cy="13" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  pelanggan: (
    <svg {...styleSvg}>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20c.9-3 3.2-4.8 6-4.8 1 0 1.9.2 2.7.6" />
      <path d="M17.5 16.5v6M14.5 19.5h6" />
    </svg>
  ),
  telepon: (
    <svg {...styleSvg}>
      <path d="M5.5 3h3l1.5 4.5-2 1.5a14 14 0 0 0 5 5l1.5-2L19 13.5V16a3 3 0 0 1-3 3A14 14 0 0 1 2.5 6a3 3 0 0 1 3-3z" />
    </svg>
  ),
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-[#1E1C18] text-[#F7F3EE]",
  user: "bg-[#F3EFE9] text-[#8B6B5A]",
  pengguna: "bg-[#F3EFE9] text-[#8B6B5A]",
  customer: "bg-[#F3EFE9] text-[#8B6B5A]",
  pelanggan: "bg-[#F3EFE9] text-[#8B6B5A]",
};

type UserRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
};

function inisial(nama: string | null) {
  const kata = (nama ?? "").trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "?";
  return (kata[0][0] + (kata[1]?.[0] ?? "")).toUpperCase();
}

const PER_HALAMAN = 10;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, created_at")
    .order("created_at", { ascending: false });

  const semuaUser = (data ?? []) as unknown as UserRow[];

  const kata = q?.trim().toLowerCase() ?? "";
  const usersTerfilter =
    kata.length > 0
      ? semuaUser.filter(
          (u) =>
            (u.full_name ?? "").toLowerCase().includes(kata) ||
            (u.phone ?? "").toLowerCase().includes(kata),
        )
      : semuaUser;

  // ---------- Pagination ----------
  const halamanSekarang = Math.max(1, parseInt(pageParam ?? "1", 10));
  const totalHalaman = Math.ceil(usersTerfilter.length / PER_HALAMAN);
  const halamanValid = Math.min(halamanSekarang, Math.max(1, totalHalaman));
  const mulai = (halamanValid - 1) * PER_HALAMAN;
  const users = usersTerfilter.slice(mulai, mulai + PER_HALAMAN);

  function hrefHalaman(h: number) {
    const params = new URLSearchParams();
    if (kata) params.set("q", q!);
    if (h > 1) params.set("page", String(h));
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  }

  const jumlahAdmin = semuaUser.filter((u) =>
    ["admin"].includes(String(u.role ?? "").toLowerCase()),
  ).length;
  const jumlahPelanggan = semuaUser.length - jumlahAdmin;
  const berTelepon = semuaUser.filter((u) => u.phone).length;

  const badge = (role: string | null) =>
    ROLE_BADGE[String(role ?? "").toLowerCase()] ??
    "bg-[#F3EFE9] text-[#8B6B5A]";

  const ringkasan = [
    {
      label: "Total Pengguna",
      value: String(semuaUser.length),
      hint: "Akun terdaftar",
      icon: IKON.pengguna,
    },
    {
      label: "Admin",
      value: String(jumlahAdmin),
      hint: "Akses dashboard",
      icon: IKON.admin,
    },
    {
      label: "Pelanggan",
      value: String(jumlahPelanggan),
      hint: "Role reguler",
      icon: IKON.pelanggan,
    },
    {
      label: "Dengan Telepon",
      value: String(berTelepon),
      hint: "Nomor kontak terisi",
      icon: IKON.telepon,
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Pengguna"
        description={`${semuaUser.length} akun terdaftar di toko. Role hanya bisa diubah di database jika kebijakan keamanan tidak mengizinkan admin mengubah profil orang lain.`}
      />

      {/* ===== Ringkasan ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {ringkasan.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-[22px] border border-black/5 shadow-sm p-5"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F3EE] text-[#8B6B5A]">
              {item.icon}
            </span>
            <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold">
              {item.label}
            </p>
            <p className="mt-2 font-serif text-[28px] leading-none tracking-[-0.03em] text-[#1E1C18]">
              {item.value}
            </p>
            <p className="mt-2 text-[12px] text-[#8A837B]">{item.hint}</p>
          </div>
        ))}
      </div>

      {/* ===== Pencarian ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <form action="/admin/users" method="GET" className="flex-1 max-w-md">
          <div className="relative">
            <span
              aria-hidden
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B7AEA3]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              name="q"
              defaultValue={kata}
              placeholder="Cari nama atau telepon…"
              aria-label="Cari pengguna"
              className="w-full h-10 rounded-full border border-[#E7E5E0] bg-white pl-10 pr-4 text-[13px] placeholder:text-[#B0A89D] focus:outline-none focus:ring-1 focus:ring-[#8B6B5A] focus:border-[#8B6B5A] transition"
            />
          </div>
        </form>

        <p className="text-[12px] text-[#8A837B]">
          Menampilkan {usersTerfilter.length} dari {semuaUser.length} pengguna
          {kata.length > 0 && (
            <Link
              href="/admin/users"
              className="ml-1.5 text-[#8B6B5A] hover:text-[#1E1C18] underline underline-offset-4 transition"
            >
              reset
            </Link>
          )}
        </p>
      </div>

      {/* ===== Daftar ===== */}
      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Telepon</th>
              <th>Role</th>
              <th>Bergabung</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="group transition hover:bg-[#FAF7F3]"
              >
                <td>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3EFE9] font-serif text-[13px] font-semibold text-[#8B6B5A]">
                      {inisial(user.full_name)}
                    </span>
                    <span className="font-medium">{user.full_name || "-"}</span>
                  </div>
                </td>
                <td className="text-[#716A63]">{user.phone || "-"}</td>
                <td>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap capitalize ${badge(user.role)}`}
                  >
                    {user.role || "-"}
                  </span>
                </td>
                <td className="whitespace-nowrap text-[#716A63]">
                  {user.created_at ? formatTanggal(user.created_at) : "-"}
                </td>
                <td className="text-right">
                  <DeleteUserButton
                    id={user.id}
                    nama={user.full_name || "Pengguna"}
                  />
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-14">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F3EE] text-[#B7AEA3]">
                    {IKON.pengguna}
                  </span>
                  <p className="mt-3 text-sm font-medium text-[#1E1C18]">
                    {semuaUser.length === 0
                      ? "Belum ada pengguna terdaftar."
                      : `Tidak ada pengguna yang cocok dengan "${kata}".`}
                  </p>
                  <p className="mt-1 text-sm text-[#8A837B]">
                    {semuaUser.length === 0
                      ? "Pengguna yang mendaftar akan muncul di sini."
                      : "Coba nama atau nomor telepon lain."}
                  </p>
                  {semuaUser.length > 0 && (
                    <Link
                      href="/admin/users"
                      className="inline-flex items-center justify-center mt-5 h-10 px-5 rounded-full bg-[#1E1C18] text-white text-[13px] font-semibold hover:bg-[#8B6B5A] transition"
                    >
                      Lihat semua pengguna
                    </Link>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Pagination ===== */}
      {totalHalaman > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4 text-[13px]">
          <p className="text-[#8A837B]">
            Menampilkan {mulai + 1}–{Math.min(mulai + PER_HALAMAN, usersTerfilter.length)} dari {usersTerfilter.length} pengguna
          </p>
          <div className="flex items-center gap-1">
            <Link
              href={hrefHalaman(halamanValid - 1)}
              aria-disabled={halamanValid <= 1}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${halamanValid <= 1 ? "pointer-events-none border-[#E7E5E0] text-[#C0B8AE]" : "border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"}`}
            >
              ←
            </Link>
            {Array.from({ length: totalHalaman }, (_, i) => i + 1).map((h) => (
              <Link
                key={h}
                href={hrefHalaman(h)}
                aria-current={h === halamanValid ? "page" : undefined}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-medium transition ${h === halamanValid ? "border-[#1E1C18] bg-[#1E1C18] text-white" : "border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"}`}
              >
                {h}
              </Link>
            ))}
            <Link
              href={hrefHalaman(halamanValid + 1)}
              aria-disabled={halamanValid >= totalHalaman}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${halamanValid >= totalHalaman ? "pointer-events-none border-[#E7E5E0] text-[#C0B8AE]" : "border-[#E7E5E0] text-[#6B655A] hover:border-[#1E1C18]"}`}
            >
              →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}