import Ngo from "../models/ngo.model.js";
import NgoDocument from "../models/NgoDocument.model.js";
import Campaign from "../models/campaign.model.js";
import Report from "../models/report.model.js";
import User from "../models/user.model.js";
import NgoProfile from "../models/ngoProfile.model.js";


import axios from "axios";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const adminhello = (req, res) => {
  res.send("Hello from admin controller");
}

export const adminsignup = async (req, res) => {//done
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new User({ name, email, password: hashedPassword, role: "admin" });
    await newAdmin.save();
    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    console.error("Admin Signup Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

export const adminLogin = async (req, res) => {//done
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const admin = await User.findOne({ email, role: { $in: ["admin", "superadmin"] } });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Generate and store token
    const token = crypto.randomBytes(32).toString("hex");
    admin.token = token;
    await admin.save();

    res.json({
      success: true,
      message: "Login successful",
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      token,
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

/* =============================
   NGO VERIFICATION CONTROLS
   ============================= */

// Get all pending NGOs for admin review

export const getPendingNGOs = async (req, res) => {
  try {
    // 1️⃣ Find pending NGOs and select only needed fields
    const ngos = await Ngo.find({ status: "pending" }, "name email phone profilePicture status website verified createdAt")
      .populate({
        path: "profile", // virtual in Ngo schema
        select: "description address phone registrationNumber mission focusAreas socialLinks preferences urnNumber verified createdAt",
      });

    // 2️⃣ Fetch documents for all pending NGOs in one query
    const ngoIds = ngos.map((ngo) => ngo._id);
    const documents = await NgoDocument.find({ ngoId: { $in: ngoIds } });

    // 3️⃣ Map documents to corresponding NGO
    const ngosWithDocs = ngos.map((ngo) => {
      const doc = documents.find((d) => d.ngoId.toString() === ngo._id.toString());
      return {
        ...ngo.toObject(),
        documents: doc || null,
      };
    });

    res.json({ success: true, ngos: ngosWithDocs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Verify NGO details via Darpan API
export const verifyNGOByDarpan = async (req, res) => {
  try {
    const { urn } = req.params;
    const response = await axios.get(`https://ngodarpan.gov.in/api/ngo_details/${urn}`);
    const ngoData = response.data;

    if (!ngoData || !ngoData.ngo_name)
      return res.status(404).json({ success: false, message: "No NGO found with given URN" });

    res.json({ success: true, ngoData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to verify NGO via Darpan API",
      error: error.message,
    });
  }
};

// Approve NGO
export const verifyNGO = async (req, res) => {
  try {
    const { ngoId } = req.params;
    console.log("Received NGO ID:", ngoId);

    // Update the NGO status and verifiedByAdmin flag
    const ngo = await Ngo.findByIdAndUpdate(
      ngoId,
      { status: "approved", verifiedByAdmin: true },
      { new: true } // return the updated document
    );

    if (!ngo) {
      return res.status(404).json({ success: false, message: "NGO not found" });
    }

    res.json({ success: true, message: "NGO approved successfully", ngo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Reject NGO with remarks
export const rejectNGO = async (req, res) => {
  try {
    const ngo = await Ngo.findByIdAndUpdate(
      req.params.ngoId,
      { status: "rejected" },
      { new: true }
    );
    await NgoDocument.findOneAndUpdate(
      { ngoId: req.params.ngoId },
      { status: "rejected", remarks: req.body?.remarks || "Rejected by admin" }
    );

    if (!ngo) return res.status(404).json({ message: "NGO not found" });
    res.json({ success: true, message: "NGO rejected", ngo });
  } catch (error) {
    console.error("NGO Rejection Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ========== Get All NGOs with Documents ========== */
export const getAllNGOs = async (req, res) => {
  try {
    // Fetch all NGOs
    const ngos = await Ngo.find().populate("_id", "name email profilePicture website verified createdAt");

    // For each NGO, fetch its documents
    const ngosWithDocs = await Promise.all(
      ngos.map(async (ngo) => {
        const documents = await NgoDocument.findOne({ ngoId: ngo._id });
        return {
          ...ngo.toObject(),
          documents: documents || null,
        };
      })
    );

    res.json({ success: true, ngos: ngosWithDocs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



/* =============================
   CAMPAIGN MANAGEMENT
   ============================= */

// Disable a campaign if reported
export const disableCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.campaignId,
      { isActive: false, status: "disabled" },
      { new: true }
    );
    if (!campaign)
      return res.status(404).json({ success: false, message: "Campaign not found" });

    res.json({ success: true, message: "Campaign disabled successfully", campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all user reports (for admin moderation)
export const getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("campaignId", "title ngoId")
      .populate("reporterId", "name email");

    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/* =============================
   DASHBOARD ANALYTICS
   ============================= */

export const getDashboardStats = async (req, res) => {
  try {
    const totalNGOs = await Ngo.countDocuments();
    const pendingNGOs = await Ngo.countDocuments({ status: "pending" });
    const approvedNGOs = await Ngo.countDocuments({ status: "approved" });
    const activeCampaigns = await Campaign.countDocuments({ isActive: true });
    const disabledCampaigns = await Campaign.countDocuments({ status: "disabled" });
    const totalReports = await Report.countDocuments();

    res.json({
      success: true,
      data: {
        totalNGOs,
        pendingNGOs,
        approvedNGOs,
        activeCampaigns,
        disabledCampaigns,
        totalReports,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
