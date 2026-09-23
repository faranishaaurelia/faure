"use client";

import { useState, useTransition } from "react";
import { saveCategory, deleteCategory } from "@/lib/actions/admin";
import ConfirmButton from "@/components/admin/ConfirmButton";

type Category = { id: number; name: string; product_count?: number };

const inputClass =
  "w-full h-10 px-4 rounded-full border border-[#E7E5E0] bg-white text-[13px] focus:outline-none focus:ring-1 focus:ring-[#8B6B5A] focus:border-[#8B6B5A] transition placeholder:text-[#B0A89D]";

export default function CategoryManager({
  categories,
}: {
  categories: Category[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveCategory({ name });
      if (result.error) setError(result.error);
      else setName("");
    });
  }

  function submitEdit(id: number) {
    setError(null);
    startTransition(async () => {
      const result = await saveCategory({ id, name: editingName });
      if (result.error) setError(result.error);
      else setEditingId(null);
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ===== Form tambah ===== */}
      <form
        onSubmit={submitCreate}
        className="bg-white rounded-[22px] border border-black/5 shadow-sm p-5 flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1">
          <label
            htmlFor="kategori-baru"
            className="block text-[10px] uppercase tracking-[0.18em] text-[#9A7B69] font-semibold mb-2"
          >
            Kategori baru
          </label>
          <input
            id="kategori-baru"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kategori, mis. Kaus, Kemeja…"
            className={inputClass}
          />
        </div>
        <div className="sm:self-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center h-10 w-full sm:w-auto px-6 rounded-full bg-[#1E1C18] text-white text-[13px] font-semibold hover:bg-[#8B6B5A] transition disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "+ Tambah Kategori"}
          </button>
        </div>
      </form>

      {error && <p className="text-[13px] text-[#B23B3B]">{error}</p>}

      {/* ===== Daftar ===== */}
      <div className="admin-card overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Produk</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((kategori) => {
              const banyak = kategori.product_count ?? 0;

              return (
                <tr
                  key={kategori.id}
                  className="group transition hover:bg-[#FAF7F3]"
                >
                  <td>
                    {editingId === kategori.id ? (
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        className="w-full max-w-xs h-9 px-4 rounded-full border border-[#E7E5E0] text-[13px] focus:outline-none focus:ring-1 focus:ring-[#8B6B5A]"
                      />
                    ) : (
                      <span className="font-medium">{kategori.name}</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap ${
                        banyak > 0
                          ? "bg-[#F3EFE9] text-[#8B6B5A]"
                          : "bg-[#F3F1EC] text-[#B0A89D]"
                      }`}
                    >
                      {banyak} produk
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {editingId === kategori.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => submitEdit(kategori.id)}
                          className="text-[#1E6B3A] font-medium hover:underline transition"
                        >
                          Simpan
                        </button>
                        <span className="mx-2 text-[#D8D1CA]">·</span>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-[#777] hover:text-[#1E1C18] transition"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(kategori.id);
                            setEditingName(kategori.name);
                          }}
                          className="text-[#8B6B5A] font-medium hover:text-[#1E1C18] transition"
                        >
                          Ubah
                        </button>
                        <span className="mx-2 text-[#D8D1CA]">·</span>
                        <ConfirmButton
                          label="Hapus"
                          confirmText={`Hapus kategori "${kategori.name}"?`}
                          className="text-[#B23B3B] font-medium"
                          action={deleteCategory}
                          id={kategori.id}
                        />
                      </>
                    )}
                  </td>
                </tr>
              );
            })}

            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-14">
                  <p className="text-sm font-medium text-[#1E1C18]">
                    Belum ada kategori.
                  </p>
                  <p className="mt-1 text-sm text-[#8A837B]">
                    Tambahkan kategori pertama lewat form di atas.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}