import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema({
  // Reference to NGO who created the campaign
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: "Ngo", required: true },

  // Core campaign details
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: [
      "Education",
      "Healthcare",
      "Environment",
      "Animal Welfare",
      "Women Empowerment",
      "Disaster Relief",
      "Other",
    ],
    default: "Other",
  },
  goalAmount: { type: Number, required: true },
  collectedAmount: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  image: { type: String }, // campaign banner image

  // Campaign status control
  status: {
    type: String,
    enum: ["active", "completed", "disabled", "pending_approval"],
    default: "pending_approval",
  },

  // Track user reports for misuse
  reports: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String },
      reportedAt: { type: Date, default: Date.now },
    },
  ],

  // Admin actions
  isDisabledByAdmin: { type: Boolean, default: false },
  adminRemark: { type: String },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CampaignSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Campaign = mongoose.model("Campaign", CampaignSchema);
export default Campaign;
