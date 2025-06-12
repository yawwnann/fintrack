// src/api/app/users/[userId]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
// Hapus: import { withCORS, handleCORSPreflight } from "@/lib/cors"; // Baris ini harus dihapus

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> } // Mempertahankan tipe params sebagai Promise
) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader ?? "";
  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { message: "Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = payload.userId; // Dapatkan userId dari payload

  try {
    // Await params sebelum destructuring
    const { userId } = await params;

    if (!userId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "User ID is required." },
        { status: 400 }
      );
    }

    if (userId !== userIdFromToken) {
      const response = NextResponse.json(
        {
          message:
            "Unauthorized access: Token does not match requested user ID",
        },
        { status: 403 }
      ); // Hapus withCORS
      return response;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    // Menggunakan 'unknown' untuk konsistensi penanganan error
    console.error("Error fetching user details:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      {
        message: "Failed to fetch user details.",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200, // Atau 204 No Content, 200 lebih sering digunakan di Next.js dev
    headers: {
      "Access-Control-Allow-Origin": "https://fintrack-financial.netlify.app", // Sesuaikan dengan origin frontend Anda
      "Access-Control-Allow-Methods": "GET", // Hanya metode yang didukung oleh route ini
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Header yang digunakan
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
