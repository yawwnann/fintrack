// src/api/app/expenses/[expenseId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
// Hapus: import { withCORS, handleCORSPreflight } from "@/lib/cors";

const prisma = new PrismaClient();

// --- METHOD: PUT (Update Expense) ---
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ expenseId: string }> } // Mempertahankan tipe params sebagai Promise
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] ?? "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    const { expenseId } = await params;

    const { amount, date, description, category } = await req.json();

    if (!expenseId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Expense ID is required." },
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
    if (!date || !category) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Missing required fields: date, category." },
        { status: 400 }
      );
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Invalid date format." },
        { status: 400 }
      );
    }

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingExpense) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }
    if (existingExpense.userId !== userIdFromToken) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Unauthorized: You do not own this expense." },
        { status: 403 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: existingExpense.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
    }

    const oldAmount = existingExpense.amount;
    const amountDifference = amount - oldAmount;

    if (amountDifference > 0 && account.currentBalance - amountDifference < 0) {
      const response = NextResponse.json(
        {
          message:
            "Insufficient balance in account to increase expense amount.",
          accountBalance: account.currentBalance,
          increaseAmount: amountDifference,
        },
        { status: 400 }
      ); // Hapus withCORS
      return response;
    }

    const updatedAccountBalance = account.currentBalance - amountDifference;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        category: category,
      },
    });

    const response = NextResponse.json(
      {
        message: "Expense updated successfully and account balance adjusted.",
        expense: updatedExpense,
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200 }
    ); // Hapus: return withCORS(response, ["PUT", "DELETE"], ["Content-Type", "Authorization"]);

    return response;
  } catch (error: unknown) {
    console.error("Error updating expense:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to update expense.",
        error: errorMessage,
      },
      { status: 500 }
    ); // Hapus: return withCORS(errorResponse, ["PUT", "DELETE"], ["Content-Type", "Authorization"]);
    return errorResponse;
  } finally {
    await prisma.$disconnect();
  }
}

// --- METHOD: DELETE (Delete Expense) ---
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ expenseId: string }> } // Mempertahankan tipe params sebagai Promise
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] ?? "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    const { expenseId } = await params;

    if (!expenseId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Expense ID is required." },
        { status: 400 }
      );
    }

    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingExpense) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }
    if (existingExpense.userId !== userIdFromToken) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Unauthorized: You do not own this expense." },
        { status: 403 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { id: existingExpense.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    const amountToRestore = existingExpense.amount;
    const updatedAccountBalance = account.currentBalance + amountToRestore;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const response = NextResponse.json(
      {
        message: "Expense deleted successfully and account balance adjusted.",
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200 }
    ); // Hapus: return withCORS(response, ["PUT", "DELETE"], ["Content-Type", "Authorization"]);

    return response;
  } catch (error: unknown) {
    console.error("Error deleting expense:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to update expense.",
        error: errorMessage,
      },
      { status: 500 }
    ); // Hapus: return withCORS(errorResponse, ["PUT", "DELETE"], ["Content-Type", "Authorization"]);
    return errorResponse;
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200, // Atau 204 No Content, 200 lebih sering digunakan di Next.js dev
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5000", // Sesuaikan dengan origin frontend Anda
      "Access-Control-Allow-Methods": "PUT, DELETE", // Hanya metode yang didukung oleh route ini
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Header yang digunakan
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
