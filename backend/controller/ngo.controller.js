import bcrypt from "bcrypt";
import crypto from "crypto";
import Ngo from "../models/ngo.model.js";
import NgoProfile from "../models/ngoProfile.model.js";
import NgoDocument from "../models/NgoDocument.model.js";

/* ────────────────────────────────
   📍 Test Endpoint
──────────────────────────────── */
export const ngoHello = (req, res) => {
  res.send("Hello from NGO controller");
};

/* ────────────────────────────────
   🧾 Register NGO
──────────────────────────────── */
export const register = async (req, res) => {
  try {
    const { name, email, password, website } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const existingNgo = await Ngo.findOne({ email });
    if (existingNgo) {
      return res.status(400).json({ message: "NGO already exists" });
    }

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const newNgo = new Ngo({
      name,
      email,
      password: hashedPassword,
      role: "ngo",
      website,
    });

    await newNgo.save();

    // create empty profile
  

    return res
      .status(201)
      .json({ message: "NGO registered successfully", ngo: newNgo });
  } catch (error) {
    console.error("Register Error:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

/* ────────────────────────────────
   🔐 Login NGO
──────────────────────────────── */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const ngo = await Ngo.findOne({ email });
    if (!ngo)
      return res.status(404).json({ message: "Invalid email or password" });

    if (ngo.password) {
      const isValid = await bcrypt.compare(password, ngo.password);
      if (!isValid)
        return res.status(404).json({ message: "Invalid email or password" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await Ngo.updateOne({ _id: ngo._id }, { token });

    return res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login Error:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

/* ────────────────────────────────
   🧾 Create NGO Profile
──────────────────────────────── */
export const createProfile = async (req, res) => {
  try {
    const {
      token,
      description,
      address,
      phone,
      registrationNumber,
      mission,
      focusAreas,
      socialLinks,
      preferences
    } = req.body;

    if (!token) return res.status(400).json({ message: "Token is required" });

    const ngo = await Ngo.findOne({ token });
    if (!ngo) return res.status(404).json({ message: "Invalid NGO" });

    const existingProfile = await NgoProfile.findOne({ ngo: ngo._id });
    if (existingProfile)
      return res
        .status(400)
        .json({ message: "Profile already exists for this NGO" });

    const profile = new NgoProfile({
      ngo: ngo._id,
      description,
      address,
      phone,
      registrationNumber,
      mission,
      focusAreas,
      socialLinks,
      preferences,
      isCompleted:true,
    });

    await profile.save();
    return res
      .status(201)
      .json({ message: "Profile created successfully", profile });
  } catch (error) {
    console.error("Create Profile Error:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

/* ────────────────────────────────
   🛠️ Update NGO Profile
──────────────────────────────── */
export const updateProfile = async (req, res) => {
  try {
    const { token, ...updateData } = req.body;

    if (!token) return res.status(400).json({ message: "Token is required" });

    const ngo = await Ngo.findOne({ token });
    if (!ngo) return res.status(404).json({ message: "Invalid NGO" });

    const profile = await NgoProfile.findOne({ ngo: ngo._id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    Object.assign(profile, updateData, { updatedAt: Date.now() });
    await profile.save();

    return res
      .status(200)
      .json({ message: "Profile updated successfully", profile });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

/* ────────────────────────────────
   📁 Submit Legal Documents
──────────────────────────────── */
export const submitDocuments = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // Find NGO using the token
    const ngo = await Ngo.findOne({ token });
    if (!ngo) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const ngoId = ngo._id;

    // Validate required files
    if (
      !req.files.trustDeed ||
      !req.files.certificate80G ||
      !req.files.panCard
    ) {
      return res.status(400).json({
        success: false,
        message: "Required documents missing",
      });
    }

    // Save document record in DB
    const newDocs = new NgoDocument({
      ngoId,
      trustDeed: req.files.trustDeed[0].path,
      certificate80G: req.files.certificate80G[0].path,
      panCard: req.files.panCard[0].path,
      registrationCertificate: req.files.registrationCertificate? req.files.registrationCertificate[0].path: null,
      financialReport: req.files.financialReport? req.files.financialReport[0].path : null,
    });

    await newDocs.save();

    // Update NGO verification status
    await Ngo.findByIdAndUpdate(ngoId, { verified: false });

    res.json({
      success: true,
      message: "Documents submitted successfully for verification",
      documents: newDocs,
    });
  } catch (error) {
    console.error("Document Submission Error:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting documents",
      error: error.message,
    });
  }
};
