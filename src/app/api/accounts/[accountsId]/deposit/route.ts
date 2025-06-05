// src/api/app/accounts/[accountId]/deposit/route.ts
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
// Hapus: import { withCORS, handleCORSPreflight } from "@/lib/cors";

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> } // Mempertahankan tipe params sebagai Promise
) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult?.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userIdFromToken = authResult.userId;

  try {
    const { accountId } = await params;
    const { amount, description } = await req.json();

    if (!accountId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Account ID is required." },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, currentBalance: true, name: true },
    });

    if (!account) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Account not found." },
        { status: 404 }
      );
    }

    if (account.userId !== userIdFromToken) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Unauthorized: Account does not belong to you." },
        { status: 403 }
      );
    }

    const updatedAccountBalance = account.currentBalance + amount;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const response = NextResponse.json(
      {
        message: `Successfully deposited ${amount} to account '${account.name}'.`,
        newAccountBalance: updatedAccountBalance,
        accountId: account.id,
        depositAmount: amount,
        description: description || null,
      },
      { status: 200 }
    ); // Hapus: return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);

    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    console.error("Error depositing to account:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to deposit to account.",
        error: errorMessage,
      },
      { status: 500 }
    ); // Hapus: return withCORS(errorResponse, ["POST"], ["Content-Type", "Authorization"]);
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}

// Hapus: export async function OPTIONS() { ... }
// Karena CORS akan dihandle di next.config.js
