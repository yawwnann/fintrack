// src/api/app/users/balance/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { withCORS, handleCORSPreflight } from "@/lib/cors";

const prisma = new PrismaClient();

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return handleCORSPreflight(["GET"], ["Content-Type", "Authorization"]);
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);

  if (!authResult) {
    const response = NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401 }
    );
    return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
  }
  const userId = authResult.userId;

  try {
    if (!userId) {
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
    }

    interface Account {
      currentBalance: number;
    }

    const totalBalance = accounts.reduce(
      (sum: number, account: Account) => sum + account.currentBalance,
      0
    );

    const response = NextResponse.json(
      { currentBalance: totalBalance },
      { status: 200 }
    );
    return withCORS(response, ["GET"], ["Content-Type", "Authorization"]);
  } catch (error) {
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
