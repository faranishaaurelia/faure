"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmButton({
  label,
  confirmText,
  pendingLabel = "Menghapus...",
  className,
  action,
  id,
}: {
  label: string;
  confirmText: string;
  pendingLabel?: string;
  className?: string;
  action: (id: number) => Promise<{ error: string | null; note?: string }>;
  id: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={isPending}
        className={className}
        onClick={() => {
          if (!window.confirm(confirmText)) return;
          setError(null);
          setNote(null);
          startTransition(async () => {
            const result = await action(id);
            if (result.error) {
              setError(result.error);
              return;
            }
            if (result.note) setNote(result.note);
            router.refresh();
          });
        }}
      >
        {isPending ? pendingLabel : label}
      </button>
      {error && <span className="mt-1 text-[11px] text-[#B23B3B]">{error}</span>}
      {note && (
        <span className="mt-1 max-w-[260px] text-right text-[11px] text-[#8B6B5A]">
          {note}
        </span>
      )}
    </span>
  );
}
