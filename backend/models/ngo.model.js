import mongoose from "mongoose";

const NgoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ["ngo"], default: "ngo" },
  token: { type: String },
  profilePicture: { type: String, default: "default.jpg" },
  website: { type: String },

  // ✅ Verification fields
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

const Ngo = mongoose.model("Ngo", NgoSchema);
export default Ngo;
