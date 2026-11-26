// src/lib/snap-client.ts  (dipakai dari komponen "use client")
declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const SNAP_SRC = "https://app.sandbox.midtrans.com/snap/snap.js"; // production: app.midtrans.com

function loadSnap(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.snap) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SNAP_SRC;
    s.setAttribute(
      "data-client-key",
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
    );
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Gagal memuat Midtrans"));
    document.body.appendChild(s);
  });
}

export type HasilBayar = {
  status: "success" | "pending" | "closed" | "error";
  error?: string;
};

// Minta token ke server lalu buka popup pembayaran.
export async function bayarDenganSnap(orderId: number): Promise<HasilBayar> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      return {
        status: "error",
        error: data.error ?? "Gagal memulai pembayaran",
      };
    }

    await loadSnap();

    return await new Promise<HasilBayar>((resolve) => {
      window.snap!.pay(data.token, {
        onSuccess: () => resolve({ status: "success" }),
        onPending: () => resolve({ status: "pending" }),
        onError: () => resolve({ status: "error", error: "Pembayaran gagal" }),
        onClose: () => resolve({ status: "closed" }),
      });
    });
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "Terjadi kesalahan",
    };
  }
}
