// models/ngoBankDetails.model.js
import mongoose from "mongoose";

const ngoBankDetailsSchema = new mongoose.Schema(
  {
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      required: true,
      unique: true
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    ifscCode: {
      type: String,
      required: true,
      uppercase: true
    },
    bankName: {
      type: String,
      required: true
    },
    razorpayAccountId: {
      type: String, // will be filled later
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("NgoBankDetails", ngoBankDetailsSchema);