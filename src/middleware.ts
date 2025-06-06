// src/middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Daftar origin frontend yang diizinkan (ganti dengan domain frontend Anda di produksi)
const allowedOrigins = [
  "http://localhost:3000", // Untuk pengembangan lokal frontend
  // 'https://your-frontend-app.vercel.app', // Ganti dengan domain frontend produksi Anda
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next(); // Buat respons awal

  const origin = request.headers.get("origin");

  // Set Access-Control-Allow-Origin
  // Jika origin permintaan termasuk dalam daftar yang diizinkan
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (origin === null && request.url.includes("/api/")) {
    // Ini bisa terjadi untuk permintaan internal dari server Next.js itu sendiri
    // Atau jika origin tidak terdefinisi (misal: permintaan file lokal).
    // Anda bisa memilih untuk mengizinkan '*' atau secara spesifik mengizinkan origin null
    // Untuk keamanan, lebih baik spesifik jika memungkinkan. Untuk debugging, '*' bisa membantu.
    // Saat ini, kita akan tetap spesifik.
    // Jika origin null, biarkan Next.js handle atau jangan set ACAO.
  }
  // Jika origin tidak diizinkan, Access-Control-Allow-Origin tidak akan disetel,
  // sehingga browser akan memblokirnya (ini yang kita inginkan untuk origin yang tidak diizinkan).

  // Set header CORS lainnya untuk semua respons (baik OPTIONS maupun permintaan asli)
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,DELETE,PATCH,POST,PUT,OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, X-Api-Version"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours

  // Tangani permintaan OPTIONS (preflight)
  if (request.method === "OPTIONS") {
    // Untuk preflight, kita harus merespons dengan status 204 No Content
    // Dan menyertakan semua header CORS yang sudah disetel.
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}

// Tentukan path mana yang akan dijalankan middleware ini
// Ini akan menerapkan middleware ke semua API Routes Anda
export const config = {
  matcher: "/api/:path*",
};
