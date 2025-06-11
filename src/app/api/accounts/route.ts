import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
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
  const userId = payload.userId;

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
    return response;
  } catch (error: unknown) {
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
    return errorResponse;
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(req: Request) {
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
  const userId = payload.userId;

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
    });

    const response = NextResponse.json(
      {
        message: "Accounts fetched successfully.",
        accounts: accounts,
      },
      { status: 200 }
    );
    return response;
  } catch (error: unknown) {
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
    return errorResponse;
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:5000",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
