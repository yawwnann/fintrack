// src/api/app/expenses/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
// Hapus: import { withCORS, handleCORSPreflight } from '@/lib/cors';

const prisma = new PrismaClient();

// --- METHOD: POST (Tambah Pengeluaran) ---
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] ?? "";
  const authResult = verifyToken(token);
  if (!authResult || !("userId" in authResult)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId;

  try {
    const { amount, date, description, category, accountId } = await req.json();

    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }
    if (!date || !category || !accountId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Missing required fields: date, category, accountId." },
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

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, currentBalance: true },
    });

    if (!account) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Account not found." },
        { status: 404 }
      );
    }
    if (account.userId !== userId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Unauthorized: Account does not belong to you." },
        { status: 403 }
      );
    }

    if (account.currentBalance < amount) {
      const response = NextResponse.json(
        {
          message:
            "Insufficient balance in selected account. Cannot perform this expense.",
          accountBalance: account.currentBalance,
          expenseAmount: amount,
        },
        { status: 400 }
      );
      // Hapus withCORS
      return response; // Kembalikan response langsung
    }

    const newExpense = await prisma.expense.create({
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        userId: userId,
        accountId: accountId,
        category: category,
      },
    });

    const updatedAccountBalance = account.currentBalance - amount;

    await prisma.account.update({
      where: { id: account.id },
      data: {
        currentBalance: updatedAccountBalance,
      },
    });

    const response = NextResponse.json(
      {
        message: "Expense added successfully and account balance updated.",
        expense: newExpense,
        newAccountBalance: updatedAccountBalance,
      },
      { status: 201 }
    );

    // Hapus: return withCORS(response, ['POST', 'GET'], ['Content-Type', 'Authorization']);
    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    console.error("Error adding expense or updating account balance:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to add expense or update account balance.",
        error: errorMessage,
      },
      { status: 500 }
    );
    // Hapus: return withCORS(errorResponse, ['POST', 'GET'], ['Content-Type', 'Authorization']);
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}

// --- METHOD: GET (Lihat Semua Pengeluaran) ---
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] ?? "";
  const authResult = verifyToken(token);
  if (!authResult || !("userId" in authResult)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId;

  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(
      {
        message: "Expenses fetched successfully.",
        expenses: expenses,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching expenses:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : "An unexpected error occurred";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to fetch expenses",
        error: errorMessage,
      },
      { status: 500 }
    );
    // Hapus: return withCORS(errorResponse, ['POST', 'GET'], ['Content-Type', 'Authorization']);
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200, // Atau 204 No Content, 200 lebih sering digunakan di Next.js dev
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5000", // Sesuaikan dengan origin frontend Anda
      "Access-Control-Allow-Methods": "POST, GET", // Hanya metode yang didukung oleh route ini
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Header yang digunakan
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
