// models/CampaignEmbedding.js
import mongoose from "mongoose";

const campaignEmbeddingSchema = new mongoose.Schema(
  {
    // 🔗 Link to campaign (source of truth)
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true
    },

    // 🧠 Semantic vector generated via embedding API
    embedding: {
      type: [Number],
      required: true
    },

    // 🏷️ Minimal contextual metadata for filtering
    metadata: {
      ngoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NGO"
      },
      category: String,
      campaignType: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("CampaignEmbedding", campaignEmbeddingSchema);
