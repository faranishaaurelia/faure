import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
