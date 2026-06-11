import mongoose, { Schema, Document, Model } from "mongoose";

export interface IToken extends Document {
  networkId: mongoose.Types.ObjectId;
  symbol: string;
  contractAddress: string;
  decimals: number;
  createdAt: Date;
  updatedAt: Date;
}

const TokenSchema: Schema = new Schema(
  {
    networkId: {
      type: Schema.Types.ObjectId,
      ref: "Network",
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    contractAddress: {
      type: String,
      required: true,
    },
    decimals: {
      type: Number,
      required: true,
      default: 18,
    },
  },
  {
    timestamps: true,
  }
);

export const Token: Model<IToken> = mongoose.models.Token || mongoose.model<IToken>("Token", TokenSchema);
