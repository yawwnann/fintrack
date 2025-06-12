// src/api/auth/login/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";
// Hapus: import { withCORS, handleCORSPreflight } from '@/lib/cors';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = generateToken(user.id);

    const response = NextResponse.json(
      {
        message: "Login successful",
        token: token,
        userId: user.id,
        name: user.name,
      },
      { status: 200 }
    );

    // Hapus: return withCORS(response, ['POST'], ['Content-Type', 'Authorization']);
    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    console.error("Error during login:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to login",
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
