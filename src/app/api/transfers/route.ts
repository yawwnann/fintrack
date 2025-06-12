// src/api/app/transfers/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT yang benar
// Hapus: import { withCORS, handleCORSPreflight } from "@/lib/cors"; // Baris ini harus dihapus

const prisma = new PrismaClient();

// Hapus: const CORS_HEADERS = { ... };

// Tambahkan fungsi OPTIONS sederhana ini untuk dev lokal
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200, // Atau 204 No Content, 200 lebih sering digunakan di Next.js dev
    headers: {
      "Access-Control-Allow-Origin": "https://fintrack-financial.netlify.app", // Sesuaikan dengan origin frontend Anda
      "Access-Control-Allow-Methods": "POST, OPTIONS", // Hanya metode yang didukung oleh route ini
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Header yang digunakan
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}

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
  const userIdFromToken = payload.userId; // Dapatkan userId dari payload

  try {
    const { sourceAccountId, destinationAccountId, amount, description } =
      await req.json();

    if (
      !sourceAccountId ||
      !destinationAccountId ||
      typeof amount !== "number" ||
      isNaN(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          message:
            "Missing required fields (sourceAccountId, destinationAccountId, amount) or invalid amount.",
        },
        { status: 400 } // Hapus headers: CORS_HEADERS
      );
    }

    if (sourceAccountId === destinationAccountId) {
      return NextResponse.json(
        {
          message: "Source and destination accounts cannot be the same.",
        },
        { status: 400 } // Hapus headers: CORS_HEADERS
      );
    }

    const [sourceAccount, destinationAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: sourceAccountId } }),
      prisma.account.findUnique({ where: { id: destinationAccountId } }),
    ]);

    if (!sourceAccount) {
      return NextResponse.json(
        { message: "Source account not found." },
        { status: 404 } // Hapus headers: CORS_HEADERS
      );
    }
    if (!destinationAccount) {
      return NextResponse.json(
        { message: "Destination account not found." },
        { status: 404 } // Hapus headers: CORS_HEADERS
      );
    }

    if (sourceAccount.userId !== userIdFromToken) {
      return NextResponse.json(
        { message: "Unauthorized: Source account does not belong to you." },
        { status: 403 } // Hapus headers: CORS_HEADERS
      );
    }
    if (destinationAccount.userId !== userIdFromToken) {
      return NextResponse.json(
        {
          message: "Unauthorized: Destination account does not belong to you.",
        },
        { status: 403 } // Hapus headers: CORS_HEADERS
      );
    }

    if (sourceAccount.currentBalance < amount) {
      return NextResponse.json(
        {
          message: `Insufficient balance in source account '${sourceAccount.name}'. Available: ${sourceAccount.currentBalance}.`,
          accountBalance: sourceAccount.currentBalance,
          transferAmount: amount,
        },
        { status: 400 } // Hapus headers: CORS_HEADERS
      );
    }

    const [updatedSourceAccount, updatedDestinationAccount] =
      await prisma.$transaction([
        prisma.account.update({
          where: { id: sourceAccountId },
          data: { currentBalance: sourceAccount.currentBalance - amount },
        }),
        prisma.account.update({
          where: { id: destinationAccountId },
          data: { currentBalance: destinationAccount.currentBalance + amount },
        }),
      ]);

    const response = NextResponse.json(
      {
        message: `Successfully transferred ${amount} from '${updatedSourceAccount.name}' to '${updatedDestinationAccount.name}'.`,
        transferDetails: {
          sourceAccountId: updatedSourceAccount.id,
          destinationAccountId: updatedDestinationAccount.id,
          amount: amount,
          description: description || null,
          newSourceAccountBalance: updatedSourceAccount.currentBalance,
          newDestinationAccountBalance:
            updatedDestinationAccount.currentBalance,
        },
      },
      { status: 200 } // Hapus headers: CORS_HEADERS
    );
    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    // Menggunakan 'unknown' untuk konsistensi penanganan error
    console.error("Error during transfer:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to perform transfer.",
        error: errorMessage,
      },
      { status: 500 } // Hapus headers: CORS_HEADERS
    );
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}
