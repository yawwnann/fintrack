// src/api/app/users/balance/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT yang benar
import { withCORS, handleCORSPreflight } from "@/lib/cors"; // Import helper CORS

const prisma = new PrismaClient();

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return handleCORSPreflight(["GET"], ["Content-Type", "Authorization"]);
}

export async function GET(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten)
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const payload = verifyToken(token);
  if (!payload) {
    const response = NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401 }
    );
    return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
  }
  const userId = payload.userId; // Dapatkan userId dari payload

  try {
    // userId sudah diverifikasi dan didapatkan dari token, jadi tidak perlu validasi body untuk userId
    if (!userId) {
      // Ini seharusnya tidak terjadi jika verifyToken sukses, tapi sebagai fallback
      const response = NextResponse.json(
        { message: "User ID not found in token." },
        { status: 400 }
      );
      return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
    }

    const accounts = await prisma.account.findMany({
      where: { userId: userId },
      select: { currentBalance: true },
    });

    if (accounts.length === 0) {
      const response = NextResponse.json(
        { currentBalance: 0, message: "No accounts found for this user." },
        { status: 200 }
      );
      return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
    } // Tidak perlu mendefinisikan interface Account secara eksplisit jika hanya untuk reduce, Prisma sudah menanganinya

    interface AccountBalance {
      currentBalance: number;
    }

    const totalBalance = accounts.reduce(
      (sum: number, account: AccountBalance) => sum + account.currentBalance,
      0
    );

    const response = NextResponse.json(
      { currentBalance: totalBalance },
      { status: 200 }
    );
    return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
  } catch (error: unknown) {
    // Menggunakan 'unknown' untuk konsistensi penanganan error
    console.error("Error fetching user balance:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to fetch user balance.",
        error: errorMessage,
      },
      { status: 500 }
    );
    return withCORS(errorResponse, ["GET"], ["Content-Type", "Authorization"]);
  } finally {
    await prisma.$disconnect();
  }
}
