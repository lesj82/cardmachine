import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // FIX for pdfkit:
    // We force Next.js to NOT bundle 'pdfkit' on the server.
    // Instead, it will be treated as an external module and 'required' at runtime.
    if (isServer) {
      
      // --- START MODIFICATION ---
      // config.externals is an array. We must push our new rule onto it.
      config.externals.push({
        'pdfkit': 'commonjs pdfkit',
      });
      // --- END MODIFICATION ---
    }

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;