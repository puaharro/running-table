import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit"],
  images: { unoptimized: true },
};

export default config;
