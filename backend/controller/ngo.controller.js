import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Ngo from "../models/ngo.model.js";
import NgoProfile from "../models/ngoProfile.model.js";
import NgoDocument from "../models/NgoDocument.model.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { NGO_STATUS } from "../constants/ngoStatus.js";
//service imports
import { upsertNgoProfile } from "../services/ngoService.js";


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/ngo';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

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

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // Check if NGO already exists
    const existingNgo = await Ngo.findOne({ email });
    if (existingNgo) {
      return res.status(400).json({ message: "NGO already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create NGO
    const newNgo = new Ngo({
      name,
      email,
      password: hashedPassword,
      role: "ngo",
      website,
      status: "registered", // explicitly set initial status
      profilePicture: "default.jpg",
    });

    await newNgo.save();

    // Create empty profile
    const profile = new NgoProfile({
      ngo: newNgo._id,
      isCompleted: false,
    });
    await profile.save();

    // Return safe fields only
    return res.status(201).json({
      message: "NGO registered successfully",
      ngo: {
        id: newNgo._id,
        name: newNgo.name,
        email: newNgo.email,
        status: newNgo.status,
        website: newNgo.website,
      },
    });

  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
/* ────────────────────────────────
   🔐 Login NGO
──────────────────────────────── */

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const ngo = await Ngo.findOne({ email }).select("+password");
    if (!ngo) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, ngo.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ JWT creation
    const token = jwt.sign(
      { id: ngo._id, role: ngo.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      ngo: {
        id: ngo._id,
        name: ngo.name,
        email: ngo.email,
        status: ngo.status,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

/* ────────────────────────────────
   🧾 Create NGO Profile
──────────────────────────────── */
export const createOrUpdateProfile = async (req, res) => {
  try {
    const ngoId = req.user.id; // from auth middleware

    const profile = await upsertNgoProfile(ngoId, req.body);

    return res.status(200).json({
      message: "Profile saved successfully",
      profile,
    });

  } catch (error) {
    console.error("NGO Profile Error:", error.message);

    return res.status(400).json({
      message: error.message,
    });
  }
};

/* ────────────────────────────────
   📁 Submit Legal Documents
──────────────────────────────── */
export const submitDocuments = async (req, res) => {
  try {
    // ✅ ALWAYS from middleware
    const ngoId = req.user.id;

    if (!ngoId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

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

    const newDocs = new NgoDocument({
      ngoId,
      trustDeed: req.files.trustDeed[0].path,
      certificate80G: req.files.certificate80G[0].path,
      panCard: req.files.panCard[0].path,
      registrationCertificate: req.files.registrationCertificate
        ? req.files.registrationCertificate[0].path
        : null,
      financialReport: req.files.financialReport
        ? req.files.financialReport[0].path
        : null,
      isSubmitted: true,
    });
    
    await newDocs.save();

    await Ngo.findByIdAndUpdate(ngoId, {
      status: NGO_STATUS.DOCUMENTS_SUBMITTED,
      verified: false
    });

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

export const getNgo = async (req, res) => {
  try {
    const ngoId = req.user.id;

    const ngo = await Ngo.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({ message: "NGO not found" });
    }

    const profile = await NgoProfile.findOne({ ngo: ngo._id });
    const docs = await NgoDocument.findOne({ ngoId: ngo._id });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({
      ngo,
      profile,
      docs
    });

  } catch (error) {
    console.error("Error fetching NGO:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
};

export const updateNGOProfilePicture = async (req, res) => {
  try {
    const { ngoId } = req.user;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const ngo = await Ngo.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({ message: "NGO not found" });
    }

    if (ngo.profilePicture && ngo.profilePicture !== "default.jpg") {
      const oldPath = `./uploads/${ngo.profilePicture}`;
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    ngo.profilePicture = req.file.filename;
    await ngo.save();

    return res.status(200).json({
      message: "Profile picture updated successfully",
      profilePicture: ngo.profilePicture
    });

  } catch (error) {
    console.error("Error updating NGO profile picture:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
