import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true }, // images pre-processed by scripts/process-images.mjs
};

export default nextConfig;
