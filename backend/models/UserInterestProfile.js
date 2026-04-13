import mongoose from "mongoose";

const UserInterestProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Donor",
    unique: true,
    required: true
  },

  categoryScores: {
    type: Map,
    of: Number,
    default: {}
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model(
  "UserInterestProfile",
  UserInterestProfileSchema
);
