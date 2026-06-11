import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Network } from "@/models/Network";
import { User } from "@/models/User";
import { extractUserIdFromAuthHeader } from "@/lib/auth";

const ADMIN_EMAIL = "harshchhatbar@gmail.com";

async function isAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const userId = extractUserIdFromAuthHeader(authHeader);
  if (!userId) return false;
  
  const user = await User.findById(userId);
  return Boolean(user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const networks = await Network.find();
    return NextResponse.json({ data: networks });
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
    const newNetwork = await Network.create(body);
    return NextResponse.json({ message: "Network added", data: newNetwork }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
