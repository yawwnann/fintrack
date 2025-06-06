// src/api/app/incomes/[incomeId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT yang benar
// Hapus: import { withCORS, handleCORSPreflight } from "@/lib/cors"; // Baris ini harus dihapus

const prisma = new PrismaClient();

// --- METHOD: PUT (Update Income) ---
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ incomeId: string }> } // Mempertahankan tipe params sebagai Promise
) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = payload.userId;

  try {
    // Await params untuk mendapatkan incomeId
    const { incomeId } = await params;

    const { amount, date, description, source } = await req.json();

    if (!incomeId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Income ID is required." },
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
    if (!date || !source) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Missing required fields: date, source." },
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

    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingIncome) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Income not found." },
        { status: 404 }
      );
    }
    if (existingIncome.userId !== userIdFromToken) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403 }
      );
    } // Pastikan ini mengacu pada akun, bukan user

    const account = await prisma.account.findUnique({
      where: { id: existingIncome.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
    }

    const oldAmount = existingIncome.amount;
    const amountDifference = amount - oldAmount; // Update saldo akun
    const updatedAccountBalance = account.currentBalance + amountDifference;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const updatedIncome = await prisma.income.update({
      where: { id: incomeId },
      data: {
        amount: amount,
        date: parsedDate,
        description: description || null,
        source: source,
      },
    });

    const response = NextResponse.json(
      {
        message: "Income updated successfully and account balance adjusted.",
        income: updatedIncome,
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200 }
    ); // Hapus withCORS

    return response;
  } catch (error) {
    console.error("Error updating income:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to update income.",
        error: errorMessage,
      },
      { status: 500 }
    ); // Hapus withCORS
    return errorResponse;
  } finally {
    await prisma.$disconnect();
  }
}

// --- METHOD: DELETE (Delete Income) ---
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ incomeId: string }> } // Mempertahankan tipe params sebagai Promise
) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = payload.userId;

  try {
    // Await params untuk mendapatkan incomeId
    const { incomeId } = await params;

    if (!incomeId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Income ID is required." },
        { status: 400 }
      );
    }

    const existingIncome = await prisma.income.findUnique({
      where: { id: incomeId },
      select: { id: true, userId: true, amount: true, accountId: true },
    });

    if (!existingIncome) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Income not found." },
        { status: 404 }
      );
    }
    if (existingIncome.userId !== userIdFromToken) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Unauthorized: You do not own this income." },
        { status: 403 }
      );
    } // Pastikan ini mengacu pada akun, bukan user

    const account = await prisma.account.findUnique({
      where: { id: existingIncome.accountId },
      select: { id: true, currentBalance: true },
    });

    if (!account) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Associated account not found." },
        { status: 404 }
      );
    }

    await prisma.income.delete({
      where: { id: incomeId },
    });

    const amountToDeduct = existingIncome.amount; // Update saldo akun
    const updatedAccountBalance = account.currentBalance - amountToDeduct;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const response = NextResponse.json(
      {
        message: "Income deleted successfully and balance adjusted.",
        newAccountBalance: updatedAccountBalance,
      },
      { status: 200 }
    ); // Hapus withCORS

    return response;
  } catch (error) {
    console.error("Error deleting income:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to delete income.",
        error: errorMessage,
      },
      { status: 500 }
    ); // Hapus withCORS
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
