/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Canvas workaround for pdfjs
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }

    return config;
  },
  // Disable ESLint during build if DISABLE_ESLINT_PLUGIN is true
  eslint: {
    ignoreDuringBuilds: process.env.DISABLE_ESLINT_PLUGIN === "true",
  },
  // Disable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: process.env.DISABLE_ESLINT_PLUGIN === "true",
  },
};

module.exports = nextConfig;
