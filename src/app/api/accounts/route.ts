// src/api/app/accounts/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT yang benar
// Hapus: import { withCORS, handleCORSPreflight } from '@/lib/cors'; // Baris ini harus dihapus

const prisma = new PrismaClient();

// --- METHOD: POST (Buat Akun Baru) ---
export async function POST(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten: verifyToken(token))
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401 }
    );
  }
  const userId = payload.userId; // Dapatkan userId dari payload

  try {
    const { name, initialBalance, type } = await req.json();

    if (!name || typeof name !== "string" || name.trim() === "") {
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
    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    // Menggunakan 'unknown' untuk penanganan error yang lebih aman
    console.error("Error creating account:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to create account.",
        error: errorMessage,
      },
      { status: 500 }
    );
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}
// --- METHOD: GET (Ambil Daftar Akun) ---
export async function GET(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten: verifyToken(token))
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401 }
    );
  }
  const userId = payload.userId; // Dapatkan userId dari payload

  try {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404 }
      );
    }

    const accounts = await prisma.account.findMany({
      where: { userId: userId },
      orderBy: { name: "asc" },
    }); // Return the accounts in a successful response

    const response = NextResponse.json(
      {
        message: "Accounts fetched successfully.",
        accounts: accounts,
      },
      { status: 200 }
    );
    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    // Menggunakan 'unknown' untuk penanganan error yang lebih aman
    console.error("Error fetching accounts:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to fetch accounts.",
        error: errorMessage,
      },
      { status: 500 }
    );
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}

// Tambahkan fungsi OPTIONS sederhana ini untuk dev lokal
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200, // Atau 204 No Content, 200 lebih sering digunakan di Next.js dev
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5000", // Sesuaikan dengan origin frontend Anda
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Hanya metode yang didukung oleh route ini
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Header yang digunakan
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
