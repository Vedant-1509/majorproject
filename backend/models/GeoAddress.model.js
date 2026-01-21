import mongoose from "mongoose";

const geoAddressSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    provider: {
      type: String,
      default: "nominatim",
    },
  },
  { timestamps: true }
);

geoAddressSchema.index({ location: "2dsphere" });

export default mongoose.model("GeoAddress", geoAddressSchema);
