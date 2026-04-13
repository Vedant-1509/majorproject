import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Donor",
    required: true,
    index: true
  },

  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    required: true,
    index: true
  },

  // 🎯 LABEL (VERY IMPORTANT FOR LTR)
  action: {
    type: String,
    enum: ["impression", "click", "donate"],
    required: true
  },

  // 🔥 FEATURE SNAPSHOT (CRITICAL)
  features: {
    campaignType: String,
    semanticScore: Number,
    categoryScore: Number,
    locationScore: Number,
    distance: Number,
    urgencyScore: Number
  },

  // 🧠 CONTEXT (OPTIONAL BUT POWERFUL)
  context: {
    category: String,
  },

  // 📊 POSITION (for bias correction later)
  rankPosition: Number,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const Interaction = mongoose.model("Interaction", interactionSchema);
export default Interaction;