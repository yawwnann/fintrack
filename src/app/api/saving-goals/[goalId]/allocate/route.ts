// src/api/app/saving-goals/[goalId]/allocate/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT yang benar
// Hapus: import { withCORS, handleCORSPreflight } from "@/lib/cors"; // Baris ini harus dihapus

const prisma = new PrismaClient();

// --- METHOD: POST (Allocate Funds to Saving Goal) ---
// Mempertahankan tipe params sebagai Promise sesuai permintaan pengguna
export async function POST(
  req: Request,
  context: { params: Promise<{ goalId: string }> } // Mengambil context secara eksplisit
) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten: verifyToken(req))
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader ?? "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    // Await params untuk mendapatkan goalId
    const { goalId } = await context.params; // Mempertahankan await context.params sesuai permintaan pengguna

    const { amount, accountId } = await req.json();

    if (!goalId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Saving Goal ID is required." },
        { status: 400 }
      );
    }
    if (!accountId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Source Account ID is required." },
        { status: 400 }
      );
    }
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      const response = NextResponse.json(
        {
          message:
            "Allocation amount is required and must be a positive number.",
        },
        { status: 400 }
      ); // Hapus withCORS
      return response;
    }

    const savingGoal = await prisma.savingGoal.findUnique({
      where: { id: goalId },
    });

    if (!savingGoal) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Saving Goal not found." },
        { status: 404 }
      );
    }
    if (savingGoal.userId !== userIdFromToken) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Unauthorized: You do not own this saving goal." },
        { status: 403 }
      );
    }
    if (savingGoal.isCompleted) {
      const response = NextResponse.json(
        {
          message:
            "Saving Goal is already completed. Cannot allocate more funds.",
        },
        { status: 400 }
      ); // Hapus withCORS
      return response;
    }
    if (savingGoal.currentSavedAmount + amount > savingGoal.targetAmount) {
      const response = NextResponse.json(
        {
          message: `Allocation amount exceeds the remaining target for '${
            savingGoal.name
          }'. Remaining: ${
            savingGoal.targetAmount - savingGoal.currentSavedAmount
          }.`,
          remainingTarget:
            savingGoal.targetAmount - savingGoal.currentSavedAmount,
        },
        { status: 400 }
      ); // Hapus withCORS
      return response;
    }

    const sourceAccount = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!sourceAccount) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Source Account not found." },
        { status: 404 }
      );
    }
    if (sourceAccount.userId !== userIdFromToken) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Unauthorized: Source account does not belong to you." },
        { status: 403 }
      );
    }
    if (sourceAccount.currentBalance < amount) {
      const response = NextResponse.json(
        {
          message: `Insufficient balance in source account '${sourceAccount.name}'. Available: ${sourceAccount.currentBalance}.`,
          accountBalance: sourceAccount.currentBalance,
          allocationAmount: amount,
        },
        { status: 400 }
      ); // Hapus withCORS
      return response;
    }

    const [updatedSourceAccount, updatedSavingGoal] = await prisma.$transaction(
      [
        prisma.account.update({
          where: { id: sourceAccount.id },
          data: { currentBalance: sourceAccount.currentBalance - amount },
        }),
        prisma.savingGoal.update({
          where: { id: savingGoal.id },
          data: {
            currentSavedAmount: savingGoal.currentSavedAmount + amount,
            isCompleted:
              savingGoal.currentSavedAmount + amount >= savingGoal.targetAmount,
          },
        }),
      ]
    );

    const response = NextResponse.json(
      {
        message: `Successfully allocated ${amount} from '${updatedSourceAccount.name}' to '${updatedSavingGoal.name}'.`,
        updatedSourceAccountBalance: updatedSourceAccount.currentBalance,
        updatedSavingGoalAmount: updatedSavingGoal.currentSavedAmount,
        isGoalCompleted: updatedSavingGoal.isCompleted,
      },
      { status: 200 }
    ); // Hapus: return withCORS(response, ["POST"], ["Content-Type", "Authorization"]);

    return response;
  } catch (error) {
    console.error("Error allocating funds to saving goal:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to allocate funds to saving goal.",
        error: errorMessage,
      },
      { status: 500 }
    ); // Hapus: return withCORS(errorResponse, ["POST"], ["Content-Type", "Authorization"]);
    return errorResponse;
  } finally {
    await prisma.$disconnect();
  }
}

// Hapus: export async function OPTIONS() { ... }
// Karena CORS akan dihandle di next.config.js
