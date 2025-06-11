import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

function extractAccountsIdFromUrl(url: string): string | null {
  const match = url.match(/accounts\/(.*?)\//) || url.match(/accounts\/(.*)$/);
  return match ? match[1] : null;
}

export async function PUT(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;
  const accountsId = extractAccountsIdFromUrl(request.url);
  if (!accountsId) {
    return NextResponse.json(
      { error: "Missing accountsId in URL" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  try {
    const { name, currentBalance, type } = await request.json();
    const account = await prisma.account.findUnique({
      where: { id: accountsId, userId },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Account not found or not owned by user." },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    const updatedAccount = await prisma.account.update({
      where: { id: accountsId },
      data: {
        name:
          typeof name === "string" && name.trim() !== ""
            ? name.trim()
            : undefined,
        currentBalance:
          typeof currentBalance === "number" ? currentBalance : undefined,
        type: typeof type === "string" ? type : undefined,
      },
    });
    return NextResponse.json(
      { message: "Account updated successfully.", account: updatedAccount },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to update account." },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || "";
  const authResult = verifyToken(token);
  if (!authResult) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const userId = authResult.userId;
  const accountsId = extractAccountsIdFromUrl(request.url);
  if (!accountsId) {
    return NextResponse.json(
      { error: "Missing accountsId in URL" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  try {
    const account = await prisma.account.findUnique({
      where: { id: accountsId, userId },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Account not found or not owned by user." },
        { status: 404, headers: CORS_HEADERS }
      );
    }
    await prisma.account.delete({ where: { id: accountsId } });
    return NextResponse.json(
      { message: "Account deleted successfully." },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to delete account." },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
