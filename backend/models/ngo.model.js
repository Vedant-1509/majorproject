// import mongoose from "mongoose";

// const NgoSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String }, // optional if using OAuth
//   role: { type: String, enum: ["ngo"], default: "ngo" },
//   token: { type: String }, // for token-based identification
//   profilePicture: { type: String, default: "default.jpg" },
//   website: { type: String },
//   verified: { type: Boolean, default: false }, // verified via NGO Darpan API
//   createdAt: { type: Date, default: Date.now },
// });

// const Ngo = mongoose.model("Ngo", NgoSchema);
// export default Ngo;

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
  urnNumber: { type: String },
  verified: { type: Boolean, default: false }, // via Darpan API
  verifiedByAdmin: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  approvedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
});

const Ngo = mongoose.model("Ngo", NgoSchema);
export default Ngo;
