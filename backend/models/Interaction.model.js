import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Donor",
    required: true,
    index: true,
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ["impression", "click", "donate"],
    required: true,
  },
  features: {
    campaignType: String,
    semanticScore: Number,
    categoryScore: Number,
    locationScore: Number,
    distance: Number,
    urgencyScore: Number,
  },
  context: {
    category: String,
  },
  metadata: {
    amount: Number,
  },
  rankPosition: Number,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const Interaction = mongoose.model("Interaction", interactionSchema);
export default Interaction;
