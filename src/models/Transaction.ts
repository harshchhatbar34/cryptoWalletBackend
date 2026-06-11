import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  txHash: string;
  networkId: mongoose.Types.ObjectId;
  amount: number;
  toAddress: string;
  type: "Send" | "Receive";
  status: "Pending" | "Confirmed" | "Failed";
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    txHash: {
      type: String,
      required: true,
    },
    networkId: {
      type: Schema.Types.ObjectId,
      ref: "Network",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    toAddress: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Send", "Receive"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Failed"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

export const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);
