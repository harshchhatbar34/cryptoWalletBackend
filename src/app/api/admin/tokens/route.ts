import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Token } from "@/models/Token";
import { User } from "@/models/User";
import { extractUserIdFromAuthHeader } from "@/lib/auth";

const ADMIN_EMAIL = "harshchhatbar@gmail.com";

async function isAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const userId = extractUserIdFromAuthHeader(authHeader);
  if (!userId) return false;
  
  const user = await User.findById(userId);
  return user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const networkId = searchParams.get("networkId");
    
    let query = {};
    if (networkId) query = { networkId };

    const tokens = await Token.find(query).populate("networkId");
    return NextResponse.json({ data: tokens });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const newToken = await Token.create(body);
    return NextResponse.json({ message: "Token added", data: newToken }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
