// src/app/middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = [
  "http://localhost:5000", // Origin frontend Anda
  // ... origin produksi jika sudah ada
];

export function middleware(request: NextRequest) {
  console.log("Middleware executed for:", request.url); // Tambahkan ini
  console.log("Request Method:", request.method); // Tambahkan ini
  console.log("Request Origin:", request.headers.get("origin")); // Tambahkan ini

  const response = NextResponse.next();

  const origin = request.headers.get("origin");
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  // Hapus else if (!origin && request.url.includes('/api/')) jika ada
  // Karena itu bisa menyulitkan debugging.

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,DELETE,PATCH,POST,PUT,OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, X-Api-Version"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
