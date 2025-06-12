/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Terapkan header ini ke semua API Routes Anda
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://fintrack-financial.netlify.app",
          }, // Pastikan ini origin frontend Anda
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, X-Api-Version",
          },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Max-Age", value: "86400" }, // Cache preflight for 24 hours
        ],
      },
    ];
  },
};

module.exports = nextConfig;
