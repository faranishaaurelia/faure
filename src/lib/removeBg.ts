// Jalan di browser (dipanggil dari client component saja).
// Gratis, tanpa API key, model AI diunduh sekali lalu di-cache browser
// (pemakaian pertama di setiap perangkat terasa lebih lambat).
export async function hapusLatar(file: File | Blob): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return await removeBackground(file, { output: { format: "image/png" } });
}
