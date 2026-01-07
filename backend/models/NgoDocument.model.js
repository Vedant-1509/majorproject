import mongoose from "mongoose";

const NgoDocumentSchema = new mongoose.Schema({
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ngo",
    required: true,
    index: true,
  },

  trustDeed: { type: String, required: true },
  certificate80G: { type: String, required: true },
  panCard: { type: String, required: true },

  registrationCertificate: { type: String },
  financialReport: { type: String },

  isSubmitted: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true,
  },

  remarks: { type: String },
}, { timestamps: true });

export default mongoose.model("NgoDocument", NgoDocumentSchema);
