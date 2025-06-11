import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

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

export async function POST(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten: verifyToken(req))
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token); // Gunakan verifyToken(token)
  if (!authResult || !authResult.userId) {
    // Cek keberadaan userId untuk validasi token
    return NextResponse.json(
      { message: "Authentication failed." },
      { status: 401 }
    );
  }
  const userId = authResult.userId; // Dapatkan userId dari hasil verifyToken

  try {
    const { name, targetAmount } = await req.json();

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        {
          message:
            "Saving goal name is required and must be a non-empty string.",
        },
        { status: 400 } // Hapus headers: CORS_HEADERS
      );
    }
    if (
      typeof targetAmount !== "number" ||
      isNaN(targetAmount) ||
      targetAmount <= 0
    ) {
      return NextResponse.json(
        { message: "Target amount is required and must be a positive number." },
        { status: 400 } // Hapus headers: CORS_HEADERS
      );
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404 } // Hapus headers: CORS_HEADERS
      );
    }

    const newSavingGoal = await prisma.savingGoal.create({
      data: {
        userId: userId,
        name: name.trim(),
        targetAmount: targetAmount,
        currentSavedAmount: 0,
        isCompleted: false,
      },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentSavedAmount: true,
        isCompleted: true,
        createdAt: true,
      },
    });

    const response = NextResponse.json(
      {
        message: "Saving goal created successfully.",
        savingGoal: newSavingGoal,
      },
      { status: 201 } // Hapus headers: CORS_HEADERS
    );
    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    // Gunakan 'unknown' untuk penanganan error yang lebih aman
    console.error("Error creating saving goal:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to create saving goal.",
        error: errorMessage,
      },
      { status: 500 } // Hapus headers: CORS_HEADERS
    );
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(req: Request) {
  // 1. Verifikasi Token & Dapatkan userId (menggunakan utilitas yang konsisten: verifyToken(req))
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token); // Gunakan verifyToken(token)
  if (!authResult || !authResult.userId) {
    // Cek keberadaan userId untuk validasi token
    return NextResponse.json(
      { message: "Authentication failed." },
      { status: 401 }
    );
  }
  const userId = authResult.userId; // Dapatkan userId dari hasil verifyToken

  try {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json(
        { message: "User not found for this token." },
        { status: 404 } // Hapus headers: CORS_HEADERS
      );
    }

    const savingGoals = await prisma.savingGoal.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "asc" },
    });

    const response = NextResponse.json(
      { savingGoals },
      { status: 200 } // Hapus headers: CORS_HEADERS
    );
    return response; // Kembalikan response langsung
  } catch (error: unknown) {
    // Gunakan 'unknown' untuk penanganan error yang lebih aman
    console.error("Error fetching saving goals:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    const errorResponse = NextResponse.json(
      {
        message: "Failed to fetch saving goals.",
        error: errorMessage,
      },
      { status: 500 } // Hapus headers: CORS_HEADERS
    );
    return errorResponse; // Kembalikan errorResponse langsung
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Authentication failed." },
      { status: 401 }
    );
  }
  const userId = authResult.userId;

  try {
    const { id, name, targetAmount, currentSavedAmount, isCompleted } =
      await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Saving goal id is required." },
        { status: 400 }
      );
    }

    const savingGoal = await prisma.savingGoal.findUnique({
      where: { id: id, userId: userId },
    });

    if (!savingGoal) {
      return NextResponse.json(
        { message: "Saving goal not found or not owned by user." },
        { status: 404 }
      );
    }

    const updatedSavingGoal = await prisma.savingGoal.update({
      where: { id: id },
      data: {
        name:
          typeof name === "string" && name.trim() !== ""
            ? name.trim()
            : undefined,
        targetAmount:
          typeof targetAmount === "number" ? targetAmount : undefined,
        currentSavedAmount:
          typeof currentSavedAmount === "number"
            ? currentSavedAmount
            : undefined,
        isCompleted: typeof isCompleted === "boolean" ? isCompleted : undefined,
      },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentSavedAmount: true,
        isCompleted: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Saving goal updated successfully.",
        savingGoal: updatedSavingGoal,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating saving goal:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      {
        message: "Failed to update saving goal.",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || "";
  const authResult = verifyToken(token);
  if (!authResult || !authResult.userId) {
    return NextResponse.json(
      { message: "Authentication failed." },
      { status: 401 }
    );
  }
  const userId = authResult.userId;

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "Saving goal id is required." },
        { status: 400 }
      );
    }

    const savingGoal = await prisma.savingGoal.findUnique({
      where: { id: id, userId: userId },
    });

    if (!savingGoal) {
      return NextResponse.json(
        { message: "Saving goal not found or not owned by user." },
        { status: 404 }
      );
    }

    await prisma.savingGoal.delete({
      where: { id: id },
    });

    return NextResponse.json(
      { message: "Saving goal deleted successfully." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error deleting saving goal:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      {
        message: "Failed to delete saving goal.",
        error: errorMessage,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
