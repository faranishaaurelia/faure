import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sembunyikan indikator Devtools Next.js yang muncul sebagai kotak hitam
  // di pojok bawah saat mode development.
  devIndicators: false,
  experimental: {
    serverActions: {
      // Batas default 1 MB tidak cukup untuk upload gambar produk & avatar
      // yang memperbolehkan hingga 5 MB. Nilai ini mencakup overhead
      // multipart/form-data (±10-20 KB per request).
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
