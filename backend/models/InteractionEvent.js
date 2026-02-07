import mongoose from "mongoose";

const interactionEventSchema = new mongoose.Schema(
  {
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

    // 🔥 ADD THIS
    campaignCategory: {
      type: String,
      required: true,
      index: true
    },

    eventType: {
      type: String,
      enum: ["IMPRESSION", "VIEW", "CLICK", "DONATION"],
      required: true,
      index: true
    },

    amount: {
      type: Number,
      default: null
    }
  },
  { timestamps: true }
);

interactionEventSchema.index({
  userId: 1,
  campaignCategory: 1,
  eventType: 1,
  createdAt: -1
});

export default mongoose.model("InteractionEvent", interactionEventSchema);
