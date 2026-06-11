import mongoose, { Schema, Document, Model } from "mongoose";

export interface INetwork extends Document {
  name: string;
  symbol: string;
  rpcUrl: string;
  chainId: string;
  isTestnet: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NetworkSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    rpcUrl: {
      type: String,
      required: true,
    },
    chainId: {
      type: String,
      required: true,
    },
    isTestnet: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Network: Model<INetwork> = mongoose.models.Network || mongoose.model<INetwork>("Network", NetworkSchema);
