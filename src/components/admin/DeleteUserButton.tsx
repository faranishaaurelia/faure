"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/lib/actions/admin";

export default function DeleteUserButton({
  id,
  nama,
}: {
  id: string;
  nama: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={isPending}
        aria-label={`Hapus pengguna ${nama}`}
        title={`Hapus pengguna ${nama}`}
        onClick={() => {
          if (!window.confirm(`Hapus pengguna "${nama}"?`)) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteUser(id);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#B23B3B] transition hover:bg-[#FCE8E6] disabled:cursor-not-allowed disabled:opacity-50"
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
          aria-hidden="true"
        >
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
      {error && (
        <span className="mt-1 max-w-[220px] text-right text-[11px] text-[#B23B3B]">
          {error}
        </span>
      )}
    </span>
  );
}
