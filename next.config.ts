// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   webpack: (config, { isServer }) => {
//     // FIX for pdfkit:
//     // We force Next.js to NOT bundle 'pdfkit' on the server.
//     // Instead, it will be treated as an external module and 'required' at runtime.
//     if (isServer) {
      
//       // --- START MODIFICATION ---
//       // config.externals is an array. We must push our new rule onto it.
//       config.externals.push({
//         'pdfkit': 'commonjs pdfkit',
//       });
//       // --- END MODIFICATION ---
//     }

//     // Important: return the modified config
//     return config;
//   },
// };

// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  webpack(config: { module: { rules: { enforce: string; test: RegExp; loader: string; exclude: RegExp[]; }[]; }; }) {
    // Disable source maps for node_modules (fixes pdfjs errors)
    config.module.rules.push({
      enforce: "pre",
      test: /\.js$/,
      loader: "source-map-loader",
      exclude: [/node_modules/],
    });

    return config;
  },
};

module.exports = nextConfig;
