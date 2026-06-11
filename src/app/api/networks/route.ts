import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Network } from "@/models/Network";
import { Token } from "@/models/Token";

export async function GET() {
  try {
    await connectToDatabase();
    
    const networks = await Network.find().lean();
    const tokens = await Token.find().lean();

    // Map tokens to their respective networks
    const data = networks.map((network: any) => {
      return {
        ...network,
        tokens: tokens.filter((t: any) => t.networkId.toString() === network._id.toString())
      };
    });

    return NextResponse.json({
      message: "Supported networks and tokens retrieved successfully",
      data
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
