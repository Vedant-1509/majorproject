import Ngo from "../models/ngo.model.js";
import NgoProfile from "../models/ngoProfile.model.js";
import mongoose from "mongoose";

export const upsertNgoProfile = async (ngoId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ngo = await Ngo.findById(ngoId).session(session);
    if (!ngo) throw new Error("NGO not found");

    // 🔒 workflow enforcement
    if (ngo.status !== "registered" && ngo.status !== "approved") {
  throw new Error("Profile modification not allowed in current state");
}

    const {
      description,
      address,
      phone,
      registrationNumber,
      mission,
      focusAreas,
      socialLinks,
      preferences,
      urnNumber,
    } = payload;

    const focusAreasArray = Array.isArray(focusAreas)
      ? focusAreas
      : typeof focusAreas === "string"
        ? focusAreas.split(",").map(f => f.trim()).filter(Boolean)
        : [];

    let profile = await NgoProfile.findOne({ ngo: ngoId }).session(session);

    if (!profile) {
      profile = new NgoProfile({ ngo: ngoId });
    }

    // Assign fields explicitly (no blind overwrite)
    if (description !== undefined) profile.description = description;
    if (address !== undefined) profile.address = address;
    if (phone !== undefined) profile.phone = phone;
    if (registrationNumber !== undefined) profile.registrationNumber = registrationNumber;
    if (mission !== undefined) profile.mission = mission;
    if (focusAreasArray.length) profile.focusAreas = focusAreasArray;
    if (socialLinks !== undefined) profile.socialLinks = socialLinks;
    if (preferences !== undefined) profile.preferences = preferences;
    if (urnNumber !== undefined) profile.urnNumber = urnNumber;

    // Completion is DERIVED, not forced
    profile.isCompleted = Boolean(
      profile.description &&
      profile.address &&
      profile.phone &&
      profile.mission
    );

    await profile.save({ session });

    await session.commitTransaction();
    session.endSession();

    return profile;

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
