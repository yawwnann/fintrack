/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pastikan ada async headers() ini
  async headers() {
    return [
      {
        // Terapkan header ini ke semua API Routes di bawah /api/
        source: "/api/:path*", // Ini akan mencakup /api/auth/*, /api/accounts/*, /api/users/*, dll.
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value: "http://localhost:3000",
          }, // <--- SANGAT PENTING: Ganti dengan origin frontend Anda!
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS",
          }, // Izinkan semua metode yang Anda gunakan
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          }, // Izinkan header yang dikirim frontend
        ],
      },
    ];
  },
};

module.exports = nextConfig;
