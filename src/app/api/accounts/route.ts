// src/api/app/accounts/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
// Hapus: import { withCORS, handleCORSPreflight } from '@/lib/cors';

const prisma = new PrismaClient();

// --- METHOD: POST (Buat Akun Baru) ---
export async function POST(req: Request) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult?.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId;

  try {
    const { name, initialBalance, type } = await req.json();

    if (!name || typeof name !== "string" || name.trim() === "") {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Account name is required and must be a non-empty string." },
        { status: 400 }
      );
    }
    const parsedInitialBalance =
      typeof initialBalance === "number" && !isNaN(initialBalance)
        ? initialBalance
        : 0;

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404 }
      );
    }

    const newAccount = await prisma.account.create({
      data: {
        userId: userId,
        name: name.trim(),
        currentBalance: parsedInitialBalance,
        type: type || null,
      },
      select: {
        id: true,
        name: true,
        currentBalance: true,
        type: true,
        createdAt: true,
      },
    });

    const response = NextResponse.json(
      {
        message: "Account created successfully.",
        account: newAccount,
      },
      { status: 201 }
    );

    // Hapus: return withCORS(response, ['POST', 'GET'], ['Content-Type', 'Authorization']);
    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    console.error("Error creating account:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to create account.",
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

// --- METHOD: GET (Lihat Semua Akun Pengguna) ---
export async function GET(req: Request) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult?.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = authResult.userId;

  try {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404 }
      );
    }

    const accounts = await prisma.account.findMany({
      where: { userId: userId },
      orderBy: { name: "asc" },
    });

    // Return the accounts in a successful response
    return NextResponse.json(
      {
        message: "Accounts fetched successfully.",
        accounts: accounts,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching accounts:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message?: string }).message
        : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to fetch accounts.",
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

// Hapus: export async function OPTIONS(req: Request) { ... }
// Karena CORS akan dihandle di next.config.js
