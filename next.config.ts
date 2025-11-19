import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Next.js to NOT bundle these packages, avoiding the "Module not found" error
  serverExternalPackages: ["tesseract.js", "pdf-parse"], 
  
  // (Optional) Ensure large payloads are allowed if you upload big images
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;