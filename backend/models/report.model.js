import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    required: true,
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // could also be "Donor" or "Ngo" if you add those later
    required: true,
  },
  reason: {
    type: String,
    required: true,
    enum: [
      "Fraudulent activity",
      "Misuse of funds",
      "Inappropriate content",
      "Fake NGO",
      "Other",
    ],
  },
  description: {
    type: String,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ["pending", "reviewed", "resolved", "dismissed"],
    default: "pending",
  },
  adminRemarks: {
    type: String,
    maxlength: 300,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  },
});

const Report = mongoose.model("Report", ReportSchema);
export default Report;
