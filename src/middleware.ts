// src/app/middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = [
  "https://relaxed-vacherin-3e7bf6.netlify.app",
  "https://relaxed-vacherin-3e7bf6.netlify.app/",
  "http://localhost:3000",
  "http://localhost:3001",
];

export function middleware(request: NextRequest) {
  console.log("Middleware executed for:", request.url);
  console.log("Request Method:", request.method);
  console.log("Request Origin:", request.headers.get("origin"));

  const response = NextResponse.next();

  const origin = request.headers.get("origin");
  if (origin) {
    // Remove trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.replace(/\/$/, "") === normalizedOrigin
    );

    if (isAllowed) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
  }

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
