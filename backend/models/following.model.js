import mongoose from "mongoose";

const ConnectionSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: "NGO", required: true },
  createdAt: { type: Date, default: Date.now }
});
const Following = mongoose.model("Following", ConnectionSchema);
export default Following;
