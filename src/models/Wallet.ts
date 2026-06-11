import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  mnemonic: string; // encrypted
  wallets: {
    networkFamily: "EVM" | "SOL" | "TRON";
    address: string;
    privateKey: string; // encrypted
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mnemonic: {
      type: String,
      required: true,
    },
    wallets: [
      {
        networkFamily: {
          type: String,
          enum: ["EVM", "SOL", "TRON"],
          required: true,
        },
        address: {
          type: String,
          required: true,
        },
        privateKey: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Wallet: Model<IWallet> = mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", WalletSchema);
