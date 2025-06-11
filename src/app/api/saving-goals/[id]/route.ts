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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  try {
    const { id } = params;
    const { name, targetAmount, currentSavedAmount, isCompleted } =
      await request.json();

    const existingGoal = await prisma.savingGoal.findUnique({
      where: { id },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: "Saving goal not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (existingGoal.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: This saving goal does not belong to you" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const updatedGoal = await prisma.savingGoal.update({
      where: { id },
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
    });

    return NextResponse.json(
      {
        message: "Saving goal updated successfully",
        savingGoal: updatedGoal,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Error updating saving goal:", error);
    return NextResponse.json(
      {
        error: "Failed to update saving goal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  try {
    const { id } = params;

    const existingGoal = await prisma.savingGoal.findUnique({
      where: { id },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: "Saving goal not found" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (existingGoal.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: This saving goal does not belong to you" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    await prisma.savingGoal.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Saving goal deleted successfully" },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Error deleting saving goal:", error);
    return NextResponse.json(
      {
        error: "Failed to delete saving goal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
