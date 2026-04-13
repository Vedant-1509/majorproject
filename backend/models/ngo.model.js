import mongoose from "mongoose";
import { NGO_STATUS_VALUES, NGO_STATUS } from "../constants/ngoStatus.js";

const NgoSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },

  password: { type: String, select: false },

  role: {
    type: String,
    enum: ["ngo"],
    default: "ngo",
    immutable: true, // cannot be changed later
  },

  profilePicture: { type: String, default: "default.jpg" },

  website: { type: String },

  status: {
    type: String,
    enum: NGO_STATUS_VALUES, // 🔒 allowed values only
    default: NGO_STATUS.REGISTERED,
    index: true,
  },
}, { timestamps: true });

export default mongoose.model("Ngo", NgoSchema);
