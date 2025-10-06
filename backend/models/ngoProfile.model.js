import mongoose from "mongoose";

const NgoProfileSchema = new mongoose.Schema({
  ngo: { type: mongoose.Schema.Types.ObjectId, ref: "Ngo", required: true }, // reference to NGO

  // basic profile info
  description: { type: String, default: "" },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zip: String,
  },
  phone: { type: String },
  registrationNumber: { type: String }, // URN
  mission: { type: String, default: "" },
  focusAreas: [String],

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

  // ✅ Verification fields
  urnNumber: { type: String },
  verified: { type: Boolean, default: false }, // via Darpan API
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const NgoProfile = mongoose.model("NgoProfile", NgoProfileSchema);
export default NgoProfile;
