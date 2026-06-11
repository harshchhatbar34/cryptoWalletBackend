import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectToDatabase from "../lib/mongodb";
import { User } from "../models/User";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ADMIN_EMAIL = "harshchhatbar@gmail.com";
const ADMIN_PASSWORD = "635820@HK";

async function seedAdmin() {
  try {
    console.log("Connecting to database...");
    await connectToDatabase();

    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log("Admin user already exists. Skipping seed.");
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    await User.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
    });

    console.log("Admin user created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin user:", error);
    process.exit(1);
  }
}

seedAdmin();
