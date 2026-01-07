import mongoose from "mongoose";

const NgoProfileSchema = new mongoose.Schema({
  ngo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ngo",
    required: true,
    unique: true, // one profile per NGO
  },

  description: { type: String, default: "" },

  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zip: String,
  },

  phone: { type: String },

  registrationNumber: { type: String },

  urnNumber: {
    type: String,
    unique: true,
    sparse: true, // avoids unique-null issues
  },

  mission: { type: String, default: "" },

  focusAreas: [{ type: String }],

  verifiedByAdmin: { type: Boolean, default: false },

  approvedAt: { type: Date },

  socialLinks: {
    website: String,
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
  },

  preferences: {
    acceptVolunteers: { type: Boolean, default: false },
    acceptDonations: { type: Boolean, default: true },
  },

  isCompleted: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("NgoProfile", NgoProfileSchema);
