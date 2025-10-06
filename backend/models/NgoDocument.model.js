import mongoose from "mongoose";

const NgoDocumentSchema = new mongoose.Schema({
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: "Ngo", required: true },
  trustDeed: { type: String, required: true },
  certificate80G: { type: String, required: true },
  panCard: { type: String, required: true },
  registrationCertificate: { type: String },
  financialReport: { type: String },
  submittedAt: { type: Date, default: Date.now },
});

const NgoDocument = mongoose.model("NgoDocument", NgoDocumentSchema);
export default NgoDocument;
