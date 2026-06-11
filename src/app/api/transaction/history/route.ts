import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Transaction } from "@/models/Transaction";
import { extractUserIdFromAuthHeader } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const authHeader = req.headers.get("authorization");
    const userId = extractUserIdFromAuthHeader(authHeader);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await Transaction.find({ userId }).populate("networkId").sort({ createdAt: -1 });

    return NextResponse.json({
      transactions
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
