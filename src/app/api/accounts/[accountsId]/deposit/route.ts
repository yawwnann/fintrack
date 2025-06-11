import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
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
    const { accountId } = await params;
    const { amount, description } = await req.json();

    if (!accountId) {
      return NextResponse.json(
        { message: "Account ID is required." },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
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
      return NextResponse.json(
        { message: "Account not found." },
        { status: 404 }
      );
    }

    if (account.userId !== userIdFromToken) {
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

    return response;
  } catch (error: unknown) {
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
