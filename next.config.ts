import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit"],
  images: { unoptimized: true },
  experimental: { globalNotFound: true },
};

export default config;
