// src/api/app/accounts/[accountId]/deposit/route.ts
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Import utilitas verifikasi JWT yang benar
// Hapus: import { withCORS, handleCORSPreflight } from "@/lib/cors"; // Baris ini harus dihapus

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> } // Mempertahankan tipe params sebagai Promise
) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten: verifyToken(req))
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Unauthorized: Invalid or missing token." },
      { status: 401 }
    );
  }
  const userIdFromToken = authResult.userId;

  try {
    // Await params untuk mendapatkan accountId
    const { accountId } = await params;
    const { amount, description } = await req.json();

    if (!accountId) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Account ID is required." },
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

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, currentBalance: true, name: true },
    });

    if (!account) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Account not found." },
        { status: 404 }
      );
    }

    if (account.userId !== userIdFromToken) {
      // Hapus withCORS
      return NextResponse.json(
        { message: "Unauthorized: Account does not belong to you." },
        { status: 403 }
      );
    }

    const updatedAccountBalance = account.currentBalance + amount;

    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: updatedAccountBalance },
    });

    const response = NextResponse.json(
      {
        message: `Successfully deposited ${amount} to account '${account.name}'.`,
        newAccountBalance: updatedAccountBalance,
        accountId: account.id,
        depositAmount: amount,
        description: description || null,
      },
      { status: 200 }
    );

    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    // Menggunakan 'unknown' untuk konsistensi penanganan error
    console.error("Error depositing to account:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to deposit to account.",
        error: errorMessage,
      },
      { status: 500 }
    );
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}

// Tambahkan kembali fungsi OPTIONS sederhana ini ke setiap route.ts
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200, // Atau 204 No Content, 200 lebih sering digunakan di Next.js dev
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5000", // Sesuaikan dengan origin frontend Anda
      "Access-Control-Allow-Methods": "POST, OPTIONS", // Hanya metode yang didukung oleh route ini
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Header yang digunakan
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
