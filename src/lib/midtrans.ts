// src/lib/midtrans.ts  (SERVER ONLY — jangan di-import dari komponen "use client")
import crypto from "crypto";

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;
const IS_PROD = process.env.MIDTRANS_IS_PRODUCTION === "true";

const SNAP_URL = IS_PROD
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";
const API_URL = IS_PROD
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

const authHeader = "Basic " + Buffer.from(SERVER_KEY + ":").toString("base64");

async function call(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  return res.json();
}

// order_id Midtrans harus unik per percobaan bayar, jadi ditambah timestamp.
// Disimpan di kolom orders.midtrans_order_id, dan webhook mencari pesanan lewat kolom itu.
export function newMidtransOrderId(orderId: number) {
  return `FAURE-${orderId}-${Date.now()}`;
}

export function createSnapTransaction(payload: unknown) {
  return call(SNAP_URL, payload);
}

export function getTransactionStatus(midtransOrderId: string) {
  return call(`${API_URL}/${midtransOrderId}/status`);
}

// Batalkan transaksi yang belum dibayar (supaya VA/QRIS-nya tidak bisa dibayar lagi)
export function cancelTransaction(midtransOrderId: string) {
  return call(`${API_URL}/${midtransOrderId}/cancel`, {});
}

// Refund. Tidak semua metode mendukung refund lewat API (VA/transfer bank biasanya tidak).
// Kalau gagal, ok=false dan admin harus mengembalikan dana manual.
export async function refundOrder(
  midtransOrderId: string,
  amount: number,
  reason: string,
  orderId: number,
): Promise<{ ok: boolean; message: string }> {
  const res = await call(`${API_URL}/${midtransOrderId}/refund`, {
    refund_key: `refund-${orderId}`, // idempotent: klik dua kali tidak refund dua kali
    amount: Math.round(amount),
    reason,
  });
  const ok = String(res.status_code) === "200";
  return {
    ok,
    message: res.status_message ?? "Tidak ada respons dari Midtrans",
  };
}

export function verifySignature(n: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}) {
  const expected = crypto
    .createHash("sha512")
    .update(n.order_id + n.status_code + n.gross_amount + SERVER_KEY)
    .digest("hex");
  return expected === n.signature_key;
}
