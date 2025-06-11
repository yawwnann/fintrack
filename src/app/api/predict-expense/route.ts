import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS, status: 200 });
}

export async function POST(request: Request) {
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const expenses = await prisma.expense.findMany({
      where: {
        userId: userId,
        date: {
          gte: thirtyDaysAgo,
          lt: today,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    const dailyExpensesMap = new Map();
    expenses.forEach((expense) => {
      const dayKey = expense.date.toISOString().split("T")[0];
      dailyExpensesMap.set(
        dayKey,
        (dailyExpensesMap.get(dayKey) || 0) + expense.amount
      );
    });

    const last30DaysData = [];
    for (let i = 0; i < 30; i++) {
      const targetDate = new Date(thirtyDaysAgo);
      targetDate.setDate(thirtyDaysAgo.getDate() + i);
      const dayKey = targetDate.toISOString().split("T")[0];
      last30DaysData.push(dailyExpensesMap.get(dayKey) || 0);
    }

    const totalExpensesInPeriod = last30DaysData.reduce(
      (sum, amount) => sum + amount,
      0
    );

    if (totalExpensesInPeriod === 0) {
      console.log(
        `No historical expenses found for user ${userId} in the last 30 days. Returning a default budget.`
      );
      return NextResponse.json(
        {
          predicted_expense: 0,
          message:
            "No historical expenses found for prediction. Returning default budget.",
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (last30DaysData.length !== 30) {
      console.error(
        "Error: Expected 30 days of data for ML model, but got:",
        last30DaysData.length
      );
      return NextResponse.json(
        {
          error:
            "Failed to retrieve sufficient historical data for prediction (expected 30 days).",
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    console.log(`Sending to Flask ML API for user ${userId}:`, last30DaysData);

    const flaskApiUrl =
      process.env.FLASK_API_URL ||
      "https://web-production-e3ea.up.railway.app/predict_expense";

    const flaskResponse = await fetch(flaskApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ last_n_days_data: last30DaysData }),
    });

    if (!flaskResponse.ok) {
      const errorData = await flaskResponse.json();
      console.error("Error from Flask API:", errorData);
      return NextResponse.json(errorData, {
        status: flaskResponse.status,
        headers: CORS_HEADERS,
      });
    }

    const predictionData = await flaskResponse.json();
    const predictedExpense = predictionData.predicted_expense;

    if (predictedExpense !== undefined && predictedExpense !== null) {
      try {
        const nextMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1
        );
        nextMonth.setHours(0, 0, 0, 0);

        await prisma.budgetRecommendation.upsert({
          where: {
            userId_month: {
              userId: userId,
              month: nextMonth,
            },
          },

          update: {
            // Jika entri sudah ada, perbarui amount-nya
            amount: predictedExpense,
          },
          create: {
            // Jika entri belum ada, buat yang baru
            userId: userId,
            month: nextMonth,
            amount: predictedExpense,
          },
        });

        console.log(
          `Budget recommendation for ${
            nextMonth.toISOString().split("T")[0]
          } (User: ${userId}) updated/created: ${predictedExpense}`
        );
      } catch (dbError) {
        console.error(
          "Error saving budget recommendation to database:",
          dbError
        );
      }
    }

    return NextResponse.json(predictionData, {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error("Error in predict-expense API route:", error);
    return NextResponse.json(
      {
        error: "Internal server error: Failed to process request.",
        details: error instanceof Error ? error.message : "No details",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  } finally {
    await prisma.$disconnect();
  }
}
