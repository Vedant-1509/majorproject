import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    // 🔗 NGO who owns the campaign
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      required: true,
      index: true
    },

    // 🏷️ Basic info
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    // 📂 Category used by recommendation engine
    category: {
      type: String,
      enum: [
        "Healthcare & Medical Aid",
        "Disaster Relief",
        "Education Support",
        "Animal Welfare",
        "Environment & Cleanliness",
        "Child Welfare",
        "Women Empowerment"
      ],
      required: true,
      index: true
    },

    // 🔁 Campaign type
    campaignType: {
      type: String,
      enum: ["MONETARY", "VOLUNTEER", "GOODS"],
      required: true,
      index: true
    },

    // 🚦 Lifecycle state
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "COMPLETED"],
      default: "ACTIVE",
      index: true
    },

    // ⏳ Duration
    startDate: { type: Date },
    endDate: { type: Date },

    // 🔍 ML-oriented scores (derived later)
    urgencyScore: {
      type: Number,
      default: 0
    },

    trustScore: {
      type: Number,
      default: 0
    },

    // 💰 Monetary Donation Fields
    monetary: {
      targetAmount: { type: Number },
      collectedAmount: { type: Number, default: 0 },
      minDonation: { type: Number, default: 50 }
    },

    // 🙋 Volunteer Campaign Fields
    volunteer: {
      requiredSkills: [{ type: String }],
      slotsAvailable: { type: Number },
      commitmentType: {
        type: String,
        enum: ["one-time", "weekly", "monthly"]
      }
    },

    // 📦 Goods Donation Fields
    goods: {
      goodsType: [{ type: String }],
      quantityRequired: { type: Number },
      pickupAvailable: { type: Boolean, default: false }
    },

    // 📊 Popularity signals (derived)
    viewCount: { type: Number, default: 0 },
    donationCount: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Campaign", campaignSchema);
