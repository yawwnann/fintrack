// src/api/auth/register/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
// Hapus: import { withCORS, handleCORSPreflight } from '@/lib/cors';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, name, password, initialBalance } = await req.json();

    if (!email || !password) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email,
        name: name || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const parsedInitialBalance =
      typeof initialBalance === "number" && !isNaN(initialBalance)
        ? initialBalance
        : 0;

    await prisma.account.create({
      data: {
        userId: newUser.id,
        name: "Main Account",
        currentBalance: parsedInitialBalance,
        type: "General",
      },
    });

    const response = NextResponse.json(
      {
        message: "User registered successfully and default account created.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      },
      { status: 201 }
    );

    // Hapus: return withCORS(response, ['POST'], ['Content-Type', 'Authorization']);
    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    console.error("Error during user registration:", error);
    let errorMessage = "An unexpected error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    const errorResponse = NextResponse.json(
      {
        message: "Failed to register user",
        error: errorMessage,
      },
      { status: 500 }
    );
    // Hapus: return withCORS(errorResponse, ['POST'], ['Content-Type', 'Authorization']);
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200, // Atau 204 No Content, 200 lebih sering digunakan di Next.js dev
    headers: {
      "Access-Control-Allow-Origin": "https://fintrack-financial.netlify.app", // Sesuaikan dengan origin frontend Anda
      "Access-Control-Allow-Methods": "POST", // Hanya metode yang didukung oleh route ini
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Header yang digunakan
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
