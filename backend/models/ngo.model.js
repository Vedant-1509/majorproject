import mongoose from "mongoose";

const NgoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ["ngo"], default: "ngo" },
  token: { type: String },
  profilePicture: { type: String, default: "default.jpg" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  verifiedByAdmin: { type: Boolean, default: false },
  website: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Ngo.schema.js

NgoSchema.virtual("profile", {
  ref: "NgoProfile",      // The model to use
  localField: "_id",       // Field on Ngo
  foreignField: "ngo",     // Field on NgoProfile
  justOne: true            // Each NGO has one profile
});

// Enable virtuals in JSON output
NgoSchema.set("toObject", { virtuals: true });
NgoSchema.set("toJSON", { virtuals: true });


const Ngo = mongoose.model("Ngo", NgoSchema);
export default Ngo;

