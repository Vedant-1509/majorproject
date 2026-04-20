// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import Ngo from "../models/ngo.model.js";
// import NgoProfile from "../models/ngoProfile.model.js";
// import NgoDocument from "../models/NgoDocument.model.js";
// import Campaign from "../models/campaign.model.js";
// import { createCampaignEmbedding } from "../services/buildCampaignEmbeddingText.js";
// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';
// import { NGO_STATUS } from "../constants/ngoStatus.js";
// //service imports
// import { upsertNgoProfile } from "../services/ngoService.js";
// import { getCoordinatesFromAddress } from "../services/geocode.service.js";


// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadDir = './uploads/ngo';
//     if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   }
// });

// /* ────────────────────────────────
//    📍 Test Endpoint
// ──────────────────────────────── */
// export const ngoHello = (req, res) => {
//   res.send("Hello from NGO controller");
// };

// /* ────────────────────────────────
//    🧾 Register NGO
// ──────────────────────────────── */
// export const register = async (req, res) => {
//   try {
//     const { name, email, password, website } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({ message: "Name, email and password are required" });
//     }

//     // Check if NGO already exists
//     const existingNgo = await Ngo.findOne({ email });
//     if (existingNgo) {
//       return res.status(400).json({ message: "NGO already exists" });
//     }

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create NGO
//     const newNgo = new Ngo({
//       name,
//       email,
//       password: hashedPassword,
//       role: "ngo",
//       website,
//       status: "registered", // explicitly set initial status
//       profilePicture: "default.jpg",
//     });

//     await newNgo.save();

//     // Create empty profile
//     const profile = new NgoProfile({
//       ngo: newNgo._id,
//       isCompleted: false,
//     });
//     await profile.save();

//     // Return safe fields only
//     return res.status(201).json({
//       message: "NGO registered successfully",
//       ngo: {
//         id: newNgo._id,
//         name: newNgo.name,
//         email: newNgo.email,
//         status: newNgo.status,
//         website: newNgo.website,
//       },
//     });

//   } catch (error) {
//     console.error("Register Error:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };
// /* ────────────────────────────────
//    🔐 Login NGO
// ──────────────────────────────── */

// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required" });
//     }

//     const ngo = await Ngo.findOne({ email }).select("+password");
//     if (!ngo) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     const isValid = await bcrypt.compare(password, ngo.password);
//     if (!isValid) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     // ✅ JWT creation
//     const token = jwt.sign(
//       { id: ngo._id, role: ngo.role, status: ngo.status },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     return res.status(200).json({
//       message: "Login successful",
//       token,
//       ngo: {
//         id: ngo._id,
//         name: ngo.name,
//         email: ngo.email,
//         role: ngo.role,
//         status: ngo.status,
//       },
//     });
//   } catch (error) {
//     console.error("Login Error:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// }

// /* ────────────────────────────────
//    🧾 Create NGO Profile
// ──────────────────────────────── */
// export const createOrUpdateProfile = async (req, res) => {
//   try {
//     const ngoId = req.user.id; // from auth middleware

//     const profile = await upsertNgoProfile(ngoId, req.body);

//     return res.status(200).json({
//       message: "Profile saved successfully",
//       profile,
//     });

//   } catch (error) {
//     console.error("NGO Profile Error:", error.message);

//     return res.status(400).json({
//       message: error.message,
//     });
//   }
// };

// /* ────────────────────────────────
//    📁 Submit Legal Documents
// ──────────────────────────────── */
// export const submitDocuments = async (req, res) => {
//   try {
//     // ✅ ALWAYS from middleware
//     const ngoId = req.user.id;

//     if (!ngoId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     if (
//       !req.files.trustDeed ||
//       !req.files.certificate80G ||
//       !req.files.panCard
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Required documents missing",
//       });
//     }

//     const newDocs = new NgoDocument({
//       ngoId,
//       trustDeed: req.files.trustDeed[0].path,
//       certificate80G: req.files.certificate80G[0].path,
//       panCard: req.files.panCard[0].path,
//       registrationCertificate: req.files.registrationCertificate
//         ? req.files.registrationCertificate[0].path
//         : null,
//       financialReport: req.files.financialReport
//         ? req.files.financialReport[0].path
//         : null,
//       isSubmitted: true,
//     });

//     await newDocs.save();

//     await Ngo.findByIdAndUpdate(ngoId, {
//       status: NGO_STATUS.DOCUMENTS_SUBMITTED,
//       verified: false
//     });

//     res.json({
//       success: true,
//       message: "Documents submitted successfully for verification",
//       documents: newDocs,
//     });
//   } catch (error) {
//     console.error("Document Submission Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error submitting documents",
//       error: error.message,
//     });
//   }
// };
// /*
// ───────────────────────────────
//    🚩 Create Campaign
// ──────────────────────────────── */

// export const createCampaign = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     console.log("Creating campaign for NGO ID:", ngoId);

//     // 1️⃣ Fetch NGO status
//     const ngo = await Ngo.findById(ngoId).select("status");

//     if (!ngo) {
//       return res.status(404).json({ message: "NGO not found" });
//     }

//     // 2️⃣ Status gate
//     if (ngo.status !== NGO_STATUS.APPROVED) {
//       if (req.files?.length > 0) {
//         req.files.forEach(file => {
//           if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//         });
//       }
//       return res.status(403).json({
//         message: "Campaign creation allowed only for accepted NGOs"
//       });
//     }

//     // 3️⃣ Extract scalar fields from body
//     const { title, description, category, campaignType, startDate, endDate } = req.body || {};

//     // ✅ Parse JSON strings sent via FormData
//     let address, monetary, volunteer, goods;
//     try {
//       address = req.body.address ? JSON.parse(req.body.address) : null;
//       monetary = req.body.monetary ? JSON.parse(req.body.monetary) : null;
//       volunteer = req.body.volunteer ? JSON.parse(req.body.volunteer) : null;
//       goods = req.body.goods ? JSON.parse(req.body.goods) : null;
//     } catch (parseError) {
//       if (req.files?.length > 0) {
//         req.files.forEach(file => {
//           if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//         });
//       }
//       return res.status(400).json({ message: "Invalid JSON in request fields" });
//     }

//     console.log("Parsed address:", address);
//     console.log("Parsed monetary:", monetary);
//     console.log("Parsed volunteer:", volunteer);
//     console.log("Parsed goods:", goods);

//     // 4️⃣ Basic validation
//     if (!title || !description || !category || !campaignType) {
//       if (req.files?.length > 0) {
//         req.files.forEach(file => {
//           if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//         });
//       }
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // 5️⃣ Date validation
//     if (!startDate || !endDate) {
//       if (req.files?.length > 0) {
//         req.files.forEach(file => {
//           if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//         });
//       }
//       return res.status(400).json({ message: "startDate and endDate are required" });
//     }

//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//       if (req.files?.length > 0) {
//         req.files.forEach(file => {
//           if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//         });
//       }
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     if (start >= end) {
//       if (req.files?.length > 0) {
//         req.files.forEach(file => {
//           if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//         });
//       }
//       return res.status(400).json({ message: "End date must be after start date" });
//     }

//     // 6️⃣ Type-specific field validation
//     if (campaignType === "MONETARY") {
//       if (!monetary?.targetAmount || !monetary?.minDonation) {
//         if (req.files?.length > 0) {
//           req.files.forEach(file => {
//             if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//           });
//         }
//         return res.status(400).json({ message: "Monetary campaigns require targetAmount and minDonation" });
//       }
//     }

//     if (campaignType === "VOLUNTEER") {
//       if (!volunteer?.slotsAvailable || !volunteer?.commitmentType) {
//         if (req.files?.length > 0) {
//           req.files.forEach(file => {
//             if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//           });
//         }
//         return res.status(400).json({ message: "Volunteer campaigns require slotsAvailable and commitmentType" });
//       }
//     }

//     if (campaignType === "GOODS") {
//       if (!goods?.quantityRequired || !goods?.goodsType?.length) {
//         if (req.files?.length > 0) {
//           req.files.forEach(file => {
//             if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//           });
//         }
//         return res.status(400).json({ message: "Goods campaigns require goodsType and quantityRequired" });
//       }
//     }

//     // 7️⃣ Handle address + geocoding
//     let locationData = {};

//     if (address) {
//       const { city, state, country, landmark } = address;

//       if (!city || !state || !country) {
//         if (req.files?.length > 0) {
//           req.files.forEach(file => {
//             if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//           });
//         }
//         return res.status(400).json({
//           message: "Address must include city, state, and country"
//         });
//       }

//       const fullAddress = `${city}, ${state}, ${country}`;
//       const coordinates = await getCoordinatesFromAddress(fullAddress);

//       locationData = {
//         address: { city, state, country, landmark: landmark || null },
//         location: { type: "Point", coordinates }
//       };
//     }

//     // 8️⃣ Handle uploaded images
//     //const uploadedImages = req.files?.map(file => file.path) || [];
//     // 8️⃣ Handle uploaded images — normalize paths for URL serving
//     const uploadedImages = req.files?.map(file => {
//       // Normalize: remove leading "./" and convert backslashes to forward slashes
//       return file.path.replace(/\\/g, '/').replace(/^\.\//, '');
//     }) || [];
//     // 9️⃣ Urgency score
//     const today = new Date();
//     const daysLeft = Math.max(Math.ceil((end - today) / (1000 * 60 * 60 * 24)), 0);

//     // 🔟 Campaign data preparation
//     const campaignData = {
//       ngoId,
//       title,
//       description,
//       category,
//       campaignType,
//       startDate: start,
//       endDate: end,
//       images: uploadedImages,
//       urgencyScore: 1 / (1 + daysLeft),
//       ...locationData
//     };

//     // 1️⃣1️⃣ Type-specific fields
//     if (campaignType === "MONETARY") campaignData.monetary = monetary;
//     if (campaignType === "VOLUNTEER") campaignData.volunteer = volunteer;
//     if (campaignType === "GOODS") campaignData.goods = goods;

//     // 1️⃣2️⃣ Create campaign
//     const campaign = await Campaign.create(campaignData);

//     // 1️⃣3️⃣ Async embedding ingestion
//     createCampaignEmbedding(campaign).catch(err => {
//       console.error("Embedding creation failed for campaign:", campaign._id, err.message);
//     });

//     return res.status(201).json({
//       message: "Campaign created successfully",
//       campaign
//     });

//   } catch (error) {
//     // 🧹 Global cleanup — remove orphaned files if DB fails after upload
//     if (req.files?.length > 0) {
//       req.files.forEach(file => {
//         if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//       });
//     }

//     console.error("Error in createCampaign:", error);
//     return res.status(500).json({
//       message: "Failed to create campaign",
//       error: error.message
//     });
//   }
// };

// /* ────────────────────────────────
//    🚩 Update Campaign Status
// ──────────────────────────────── */

// export const updateCampaignStatus = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     const { id: campaignId } = req.params;
//     const { status } = req.body;

//     const allowedStatuses = ["ACTIVE", "PAUSED", "COMPLETED"];

//     if (!allowedStatuses.includes(status)) {
//       return res.status(400).json({
//         message: "Invalid campaign status"
//       });
//     }

//     const campaign = await Campaign.findOneAndUpdate(
//       { _id: campaignId, ngoId },
//       { status },
//       { new: true }
//     );

//     if (!campaign) {
//       return res.status(404).json({
//         message: "Campaign not found or unauthorized"
//       });
//     }

//     res.json({
//       message: `Campaign status updated to ${status}`,
//       campaign
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to update campaign status",
//       error: error.message
//     });
//   }
// };


// export const getNgoCampaigns = async (req, res) => {
//   try {
//     const ngoId = req.user.id;

//     const campaigns = await Campaign.find({ ngoId }).sort({
//       createdAt: -1
//     });

//     res.json(campaigns);
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to fetch campaigns"
//     });
//   }
// };


// export const getNgo = async (req, res) => {
//   try {
//     const ngoId = req.user.id;

//     const ngo = await Ngo.findById(ngoId);
//     if (!ngo) {
//       return res.status(404).json({ message: "NGO not found" });
//     }

//     const profile = await NgoProfile.findOne({ ngo: ngo._id });
//     const docs = await NgoDocument.findOne({ ngoId: ngo._id });

//     if (!profile) {
//       return res.status(404).json({ message: "Profile not found" });
//     }

//     return res.status(200).json({
//       ngo,
//       profile,
//       docs
//     });

//   } catch (error) {
//     console.error("Error fetching NGO:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message
//     });
//   }
// };

// export const updateNGOProfilePicture = async (req, res) => {
//   try {
//     const { ngoId } = req.user;

//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     const ngo = await Ngo.findById(ngoId);
//     if (!ngo) {
//       return res.status(404).json({ message: "NGO not found" });
//     }

//     if (ngo.profilePicture && ngo.profilePicture !== "default.jpg") {
//       const oldPath = `./uploads/${ngo.profilePicture}`;
//       if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//     }

//     ngo.profilePicture = req.file.filename;
//     await ngo.save();

//     return res.status(200).json({
//       message: "Profile picture updated successfully",
//       profilePicture: ngo.profilePicture
//     });

//   } catch (error) {
//     console.error("Error updating NGO profile picture:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };


// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import crypto from "crypto";
// import Ngo from "../models/ngo.model.js";
// import NgoProfile from "../models/ngoProfile.model.js";
// import NgoDocument from "../models/NgoDocument.model.js";
// import Campaign from "../models/campaign.model.js";
// import { createCampaignEmbedding } from "../services/buildCampaignEmbeddingText.js";
// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';
// import { NGO_STATUS } from "../constants/ngoStatus.js";
// import { upsertNgoProfile } from "../services/ngoService.js";
// import { getCoordinatesFromAddress } from "../services/geocode.service.js";

// /* ────────────────────────────────
//    🛠️ Shared cleanup helper
// ──────────────────────────────── */
// const cleanupFiles = (files) => {
//   if (files?.length > 0) {
//     files.forEach(file => {
//       if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//     });
//   }
// };

// /* ────────────────────────────────
//    📍 Test Endpoint
// ──────────────────────────────── */
// export const ngoHello = (req, res) => {
//   res.send("Hello from NGO controller");
// };

// /* ────────────────────────────────
//    🧾 Register NGO
// ──────────────────────────────── */
// export const register = async (req, res) => {
//   try {
//     const { name, email, password, website } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({ message: "Name, email and password are required" });
//     }

//     const existingNgo = await Ngo.findOne({ email });
//     if (existingNgo) {
//       return res.status(400).json({ message: "NGO already exists" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newNgo = new Ngo({
//       name,
//       email,
//       password: hashedPassword,
//       role: "ngo",
//       website,
//       status: "registered",
//       profilePicture: "default.jpg",
//     });

//     await newNgo.save();

//     const profile = new NgoProfile({
//       ngo: newNgo._id,
//       isCompleted: false,
//     });
//     await profile.save();

//     return res.status(201).json({
//       message: "NGO registered successfully",
//       ngo: {
//         id: newNgo._id,
//         name: newNgo.name,
//         email: newNgo.email,
//         status: newNgo.status,
//         website: newNgo.website,
//       },
//     });

//   } catch (error) {
//     console.error("Register Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🔐 Login NGO
// ──────────────────────────────── */
// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required" });
//     }

//     const ngo = await Ngo.findOne({ email }).select("+password");
//     if (!ngo) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     const isValid = await bcrypt.compare(password, ngo.password);
//     if (!isValid) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     const token = jwt.sign(
//       { id: ngo._id, role: ngo.role, status: ngo.status },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     return res.status(200).json({
//       message: "Login successful",
//       token,
//       ngo: {
//         id: ngo._id,
//         name: ngo.name,
//         email: ngo.email,
//         role: ngo.role,
//         status: ngo.status,
//       },
//     });
//   } catch (error) {
//     console.error("Login Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🚪 Logout NGO
// ──────────────────────────────── */
// export const logout = async (req, res) => {
//   try {
//     // JWT is stateless — client drops the token
//     // If you add Redis token blacklisting later, add it here
//     return res.status(200).json({ message: "Logged out successfully" });
//   } catch (error) {
//     return res.status(500).json({ message: "Logout failed", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🔑 Forgot Password
// ──────────────────────────────── */
// export const forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).json({ message: "Email is required" });

//     const ngo = await Ngo.findOne({ email });

//     // Always return same message to prevent email enumeration attacks
//     if (!ngo) {
//       return res.status(200).json({ message: "If this email exists, a reset link has been sent" });
//     }

//     const resetToken = crypto.randomBytes(32).toString("hex");
//     const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

//     ngo.resetPasswordToken = hashedToken;
//     ngo.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
//     await ngo.save();

//     // TODO: replace with actual email service (nodemailer / sendgrid)
//     // const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
//     // await sendResetEmail(ngo.email, resetUrl);
//     console.log("🔑 Reset Token (dev only):", resetToken); // remove in production

//     return res.status(200).json({ message: "If this email exists, a reset link has been sent" });

//   } catch (error) {
//     console.error("Forgot Password Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🔒 Reset Password
// ──────────────────────────────── */
// export const resetPassword = async (req, res) => {
//   try {
//     const { token } = req.params;
//     const { newPassword } = req.body;

//     if (!token || !newPassword) {
//       return res.status(400).json({ message: "Token and new password are required" });
//     }

//     if (newPassword.length < 8) {
//       return res.status(400).json({ message: "Password must be at least 8 characters" });
//     }

//     const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

//     const ngo = await Ngo.findOne({
//       resetPasswordToken: hashedToken,
//       resetPasswordExpiry: { $gt: Date.now() },
//     });

//     if (!ngo) {
//       return res.status(400).json({ message: "Invalid or expired reset token" });
//     }

//     ngo.password = await bcrypt.hash(newPassword, 10);
//     ngo.resetPasswordToken = undefined;
//     ngo.resetPasswordExpiry = undefined;
//     await ngo.save();

//     return res.status(200).json({ message: "Password reset successfully" });

//   } catch (error) {
//     console.error("Reset Password Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🔐 Change Password (Authenticated)
// ──────────────────────────────── */
// export const changePassword = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     const { currentPassword, newPassword } = req.body;

//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({ message: "Both current and new password are required" });
//     }

//     if (newPassword.length < 8) {
//       return res.status(400).json({ message: "New password must be at least 8 characters" });
//     }

//     const ngo = await Ngo.findById(ngoId).select("+password");
//     if (!ngo) return res.status(404).json({ message: "NGO not found" });

//     const isMatch = await bcrypt.compare(currentPassword, ngo.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Current password is incorrect" });
//     }

//     ngo.password = await bcrypt.hash(newPassword, 10);
//     await ngo.save();

//     return res.status(200).json({ message: "Password changed successfully" });

//   } catch (error) {
//     console.error("Change Password Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🧾 Create / Update NGO Profile
// ──────────────────────────────── */
// export const createOrUpdateProfile = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     console.log("Upserting profile for NGO ID:", ngoId);
//     const profile = await upsertNgoProfile(ngoId, req.body);
//     return res.status(200).json({ message: "Profile saved successfully", profile });
//   } catch (error) {
//     console.error("NGO Profile Error:", error.message);
//     return res.status(400).json({ message: error.message });
//   }
// };

// /* ────────────────────────────────
//    📁 Submit Legal Documents
// ──────────────────────────────── */
// export const submitDocuments = async (req, res) => {
//   try {
//     const ngoId = req.user.id;

//     if (!ngoId) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     if (!req.files.trustDeed || !req.files.certificate80G || !req.files.panCard) {
//       return res.status(400).json({ success: false, message: "Required documents missing" });
//     }

//     const newDocs = new NgoDocument({
//       ngoId,
//       trustDeed: req.files.trustDeed[0].path,
//       certificate80G: req.files.certificate80G[0].path,
//       panCard: req.files.panCard[0].path,
//       registrationCertificate: req.files.registrationCertificate
//         ? req.files.registrationCertificate[0].path : null,
//       financialReport: req.files.financialReport
//         ? req.files.financialReport[0].path : null,
//       isSubmitted: true,
//     });

//     await newDocs.save();

//     await Ngo.findByIdAndUpdate(ngoId, {
//       status: NGO_STATUS.DOCUMENTS_SUBMITTED,
//       verified: false,
//     });

//     res.json({
//       success: true,
//       message: "Documents submitted successfully for verification",
//       documents: newDocs,
//     });
//   } catch (error) {
//     console.error("Document Submission Error:", error);
//     res.status(500).json({ success: false, message: "Error submitting documents", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    📄 Document Verification Status
// ──────────────────────────────── */
// export const getDocumentStatus = async (req, res) => {
//   try {
//     const ngoId = req.user.id;

//     const ngo = await Ngo.findById(ngoId).select("status verified");
//     if (!ngo) return res.status(404).json({ message: "NGO not found" });

//     const docs = await NgoDocument.findOne({ ngoId }).select(
//       "isSubmitted isVerified rejectionReason createdAt updatedAt"
//     );

//     return res.status(200).json({
//       ngoStatus: ngo.status,
//       isVerified: ngo.verified,
//       documents: docs ? {
//         isSubmitted: docs.isSubmitted,
//         isVerified: docs.isVerified,
//         rejectionReason: docs.rejectionReason || null,
//         submittedAt: docs.createdAt,
//         lastUpdated: docs.updatedAt,
//       } : null,
//     });

//   } catch (error) {
//     console.error("Document Status Error:", error);
//     return res.status(500).json({ message: "Failed to fetch document status", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🚩 Create Campaign
// ──────────────────────────────── */
// export const createCampaign = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     console.log("Creating campaign for NGO ID:", ngoId);

//     // 1️⃣ Fetch NGO status
//     const ngo = await Ngo.findById(ngoId).select("status");
//     if (!ngo) {
//       cleanupFiles(req.files);
//       return res.status(404).json({ message: "NGO not found" });
//     }

//     // 2️⃣ Status gate
//     if (ngo.status !== NGO_STATUS.APPROVED) {
//       cleanupFiles(req.files);
//       return res.status(403).json({ message: "Campaign creation allowed only for accepted NGOs" });
//     }

//     // 3️⃣ Extract scalar fields
//     const { title, description, category, campaignType, startDate, endDate } = req.body || {};

//     // 4️⃣ Parse JSON strings sent via FormData
//     let address, monetary, volunteer, goods;
//     try {
//       address   = req.body.address   ? JSON.parse(req.body.address)   : null;
//       monetary  = req.body.monetary  ? JSON.parse(req.body.monetary)  : null;
//       volunteer = req.body.volunteer ? JSON.parse(req.body.volunteer) : null;
//       goods     = req.body.goods     ? JSON.parse(req.body.goods)     : null;
//     } catch (parseError) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Invalid JSON in request fields" });
//     }

//     // 5️⃣ Basic validation
//     if (!title || !description || !category || !campaignType) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // 6️⃣ Date validation
//     if (!startDate || !endDate) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "startDate and endDate are required" });
//     }

//     const start = new Date(startDate);
//     const end   = new Date(endDate);

//     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     if (start >= end) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "End date must be after start date" });
//     }

//     // 7️⃣ Type-specific validation
//     if (campaignType === "MONETARY" && (!monetary?.targetAmount || !monetary?.minDonation)) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Monetary campaigns require targetAmount and minDonation" });
//     }

//     if (campaignType === "VOLUNTEER" && (!volunteer?.slotsAvailable || !volunteer?.commitmentType)) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Volunteer campaigns require slotsAvailable and commitmentType" });
//     }

//     if (campaignType === "GOODS" && (!goods?.quantityRequired || !goods?.goodsType?.length)) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Goods campaigns require goodsType and quantityRequired" });
//     }

//     // 8️⃣ Address + geocoding
//     let locationData = {};
//     if (address) {
//       const { city, state, country, landmark } = address;
//       if (!city || !state || !country) {
//         cleanupFiles(req.files);
//         return res.status(400).json({ message: "Address must include city, state, and country" });
//       }
//       const coordinates = await getCoordinatesFromAddress(`${city}, ${state}, ${country}`);
//       locationData = {
//         address: { city, state, country, landmark: landmark || null },
//         location: { type: "Point", coordinates },
//       };
//     }

//     // 9️⃣ Normalize image paths for URL serving
//     const uploadedImages = req.files?.map(file =>
//       file.path.replace(/\\/g, '/').replace(/^\.\//, '')
//     ) || [];

//     // 🔟 Urgency score
//     const daysLeft = Math.max(Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)), 0);

//     // 1️⃣1️⃣ Build campaign data
//     const campaignData = {
//       ngoId,
//       title,
//       description,
//       category,
//       campaignType,
//       startDate: start,
//       endDate: end,
//       images: uploadedImages,
//       urgencyScore: 1 / (1 + daysLeft),
//       ...locationData,
//     };

//     if (campaignType === "MONETARY")  campaignData.monetary  = monetary;
//     if (campaignType === "VOLUNTEER") campaignData.volunteer = volunteer;
//     if (campaignType === "GOODS")     campaignData.goods     = goods;

//     // 1️⃣2️⃣ Create
//     const campaign = await Campaign.create(campaignData);

//     // 1️⃣3️⃣ Async embedding
//     createCampaignEmbedding(campaign).catch(err =>
//       console.error("Embedding creation failed:", campaign._id, err.message)
//     );

//     return res.status(201).json({ message: "Campaign created successfully", campaign });

//   } catch (error) {
//     cleanupFiles(req.files);
//     console.error("Error in createCampaign:", error);
//     return res.status(500).json({ message: "Failed to create campaign", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    ✏️ Update Campaign
// ──────────────────────────────── */
// export const updateCampaign = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     const { id: campaignId } = req.params;

//     const allowedUpdates = ["title", "description", "category", "startDate", "endDate", "monetary", "volunteer", "goods", "address"];
//     const updates = {};
//     allowedUpdates.forEach(field => {
//       if (req.body[field] !== undefined) updates[field] = req.body[field];
//     });

//     if (Object.keys(updates).length === 0 && !req.files?.length) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "No valid fields to update" });
//     }

//     const existing = await Campaign.findOne({ _id: campaignId, ngoId });
//     if (!existing) {
//       cleanupFiles(req.files);
//       return res.status(404).json({ message: "Campaign not found or unauthorized" });
//     }

//     // Date validation
//     if (updates.startDate || updates.endDate) {
//       const start = new Date(updates.startDate || existing.startDate);
//       const end   = new Date(updates.endDate   || existing.endDate);
//       if (start >= end) {
//         cleanupFiles(req.files);
//         return res.status(400).json({ message: "End date must be after start date" });
//       }
//       if (updates.endDate) {
//         const daysLeft = Math.max(Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)), 0);
//         updates.urgencyScore = 1 / (1 + daysLeft);
//       }
//     }

//     // Address geocoding
//     if (updates.address) {
//       const { city, state, country, landmark } = updates.address;
//       if (!city || !state || !country) {
//         cleanupFiles(req.files);
//         return res.status(400).json({ message: "Address must include city, state, and country" });
//       }
//       const coordinates = await getCoordinatesFromAddress(`${city}, ${state}, ${country}`);
//       updates.location = { type: "Point", coordinates };
//     }

//     // Image replacement
//     if (req.files?.length > 0) {
//       // Delete old images from disk
//       if (existing.images?.length > 0) {
//         existing.images.forEach(imgPath => {
//           if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
//         });
//       }
//       updates.images = req.files.map(file =>
//         file.path.replace(/\\/g, '/').replace(/^\.\//, '')
//       );
//     }

//     const updatedCampaign = await Campaign.findOneAndUpdate(
//       { _id: campaignId, ngoId },
//       { $set: updates },
//       { new: true, runValidators: true }
//     );

//     // Re-generate embedding since content changed
//     createCampaignEmbedding(updatedCampaign).catch(err =>
//       console.error("Embedding update failed:", updatedCampaign._id, err.message)
//     );

//     return res.status(200).json({ message: "Campaign updated successfully", campaign: updatedCampaign });

//   } catch (error) {
//     cleanupFiles(req.files);
//     console.error("Update Campaign Error:", error);
//     return res.status(500).json({ message: "Failed to update campaign", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🗑️ Delete Campaign
// ──────────────────────────────── */
// export const deleteCampaign = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     const { id: campaignId } = req.params;

//     const campaign = await Campaign.findOne({ _id: campaignId, ngoId });
//     if (!campaign) {
//       return res.status(404).json({ message: "Campaign not found or unauthorized" });
//     }

//     // Block deletion if ACTIVE — must pause first
//     if (campaign.status === "ACTIVE") {
//       return res.status(403).json({
//         message: "Cannot delete an active campaign. Pause it first.",
//       });
//     }

//     // Delete associated images from disk
//     if (campaign.images?.length > 0) {
//       campaign.images.forEach(imgPath => {
//         if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
//       });
//     }

//     await Campaign.findByIdAndDelete(campaignId);

//     return res.status(200).json({ message: "Campaign deleted successfully" });

//   } catch (error) {
//     console.error("Delete Campaign Error:", error);
//     return res.status(500).json({ message: "Failed to delete campaign", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🚩 Update Campaign Status
//    ✅ Fixed: now uses req.params.id
// ──────────────────────────────── */
// export const updateCampaignStatus = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     const { id: campaignId } = req.params; // ✅ fixed — was missing in old route
//     const { status } = req.body;

//     const allowedStatuses = ["ACTIVE", "PAUSED", "COMPLETED"];
//     if (!allowedStatuses.includes(status)) {
//       return res.status(400).json({ message: "Invalid campaign status" });
//     }

//     const campaign = await Campaign.findOneAndUpdate(
//       { _id: campaignId, ngoId },
//       { status },
//       { new: true }
//     );

//     if (!campaign) {
//       return res.status(404).json({ message: "Campaign not found or unauthorized" });
//     }

//     res.json({ message: `Campaign status updated to ${status}`, campaign });

//   } catch (error) {
//     res.status(500).json({ message: "Failed to update campaign status", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    📋 Get All NGO Campaigns
// ──────────────────────────────── */
// export const getNgoCampaigns = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     const campaigns = await Campaign.find({ ngoId }).sort({ createdAt: -1 });
//     res.json(campaigns);
//   } catch (error) {
//     res.status(500).json({ message: "Failed to fetch campaigns" });
//   }
// };

// /* ────────────────────────────────
//    📋 Get Single Campaign
// ──────────────────────────────── */
// export const getSingleCampaign = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     const { id: campaignId } = req.params;

//     const campaign = await Campaign.findOne({ _id: campaignId, ngoId });
//     if (!campaign) {
//       return res.status(404).json({ message: "Campaign not found or unauthorized" });
//     }

//     res.json(campaign);
//   } catch (error) {
//     res.status(500).json({ message: "Failed to fetch campaign", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    📊 NGO Dashboard Stats
// ──────────────────────────────── */
// export const getNgoDashboard = async (req, res) => {
//   try {
//     const ngoId = req.user.id;
//     const campaigns = await Campaign.find({ ngoId });

//     const stats = {
//       total:     campaigns.length,
//       active:    campaigns.filter(c => c.status === "ACTIVE").length,
//       paused:    campaigns.filter(c => c.status === "PAUSED").length,
//       completed: campaigns.filter(c => c.status === "COMPLETED").length,

//       // Monetary
//       totalGoalAmount: campaigns
//         .filter(c => c.campaignType === "MONETARY" && c.monetary?.targetAmount)
//         .reduce((sum, c) => sum + c.monetary.targetAmount, 0),

//       totalRaisedAmount: campaigns
//         .filter(c => c.campaignType === "MONETARY" && c.monetary?.collectedAmount)
//         .reduce((sum, c) => sum + c.monetary.collectedAmount, 0),

//       // Volunteer
//       totalVolunteersNeeded: campaigns
//         .filter(c => c.campaignType === "VOLUNTEER" && c.volunteer?.slotsAvailable)
//         .reduce((sum, c) => sum + c.volunteer.slotsAvailable, 0),

//       // Category breakdown
//       byCategory: campaigns.reduce((acc, c) => {
//         acc[c.category] = (acc[c.category] || 0) + 1;
//         return acc;
//       }, {}),

//       // Most urgent active campaign
//       mostUrgent: campaigns
//         .filter(c => c.status === "ACTIVE")
//         .sort((a, b) => b.urgencyScore - a.urgencyScore)[0] || null,
//     };

//     return res.status(200).json({ stats, campaigns });

//   } catch (error) {
//     console.error("Dashboard Error:", error);
//     return res.status(500).json({ message: "Failed to fetch dashboard", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    👤 Get NGO Profile
// ──────────────────────────────── */
// export const getNgo = async (req, res) => {
//   try {
//     const ngoId = req.user.id;

//     const ngo = await Ngo.findById(ngoId);
//     if (!ngo) return res.status(404).json({ message: "NGO not found" });

//     const profile = await NgoProfile.findOne({ ngo: ngo._id });
//     const docs    = await NgoDocument.findOne({ ngoId: ngo._id });

//     if (!profile) return res.status(404).json({ message: "Profile not found" });

//     return res.status(200).json({ ngo, profile, docs });

//   } catch (error) {
//     console.error("Error fetching NGO:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

// /* ────────────────────────────────
//    🖼️ Update NGO Profile Picture
// ──────────────────────────────── */
// export const updateNGOProfilePicture = async (req, res) => {
//   try {
//     const ngoId = req.user.id; // ✅ fixed: was req.user.ngoId which would be undefined

//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     const ngo = await Ngo.findById(ngoId);
//     if (!ngo) return res.status(404).json({ message: "NGO not found" });

//     // Delete old picture if not default
//     if (ngo.profilePicture && ngo.profilePicture !== "default.jpg") {
//       const oldPath = `./uploads/${ngo.profilePicture}`;
//       if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//     }

//     ngo.profilePicture = req.file.filename;
//     await ngo.save();

//     return res.status(200).json({
//       message: "Profile picture updated successfully",
//       profilePicture: ngo.profilePicture,
//     });

//   } catch (error) {
//     console.error("Error updating NGO profile picture:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };


import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Ngo from "../models/ngo.model.js";
import NgoProfile from "../models/ngoProfile.model.js";
import NgoDocument from "../models/NgoDocument.model.js";
import Campaign from "../models/campaign.model.js";
import { createCampaignEmbedding } from "../services/buildCampaignEmbeddingText.js";
import fs from "fs";
import { NGO_STATUS } from "../constants/ngoStatus.js";
import { upsertNgoProfile } from "../services/ngoService.js";
import { getCoordinatesFromAddress } from "../services/geocode.service.js";
import NgoBankDetails from "../models/ngoBankDetailsSchema.js";
import Razorpay from "razorpay";

/* ─────────────────────────────────────────────────────
   📍 Test
───────────────────────────────────────────────────── */
export const ngoHello = (req, res) => {
  res.send("Hello from NGO controller");
};

/* ─────────────────────────────────────────────────────
   🧾 Register
───────────────────────────────────────────────────── */
export const register = async (req, res) => {
  try {
    const { name, email, password, website } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingNgo = await Ngo.findOne({ email });
    if (existingNgo) {
      return res.status(400).json({ message: "NGO already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newNgo = new Ngo({
      name,
      email,
      password: hashedPassword,
      role: "ngo",
      website,
      status: "registered",
      profilePicture: "default.jpg",
    });

    await newNgo.save();

    const profile = new NgoProfile({
      ngo: newNgo._id,
      isCompleted: false,
    });
    await profile.save();

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
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────
   🔐 Login
───────────────────────────────────────────────────── */
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

    const token = jwt.sign(
      { id: ngo._id, role: ngo.role, status: ngo.status },
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
        role: ngo.role,
        status: ngo.status,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────
   🧾 Create / Update Profile
───────────────────────────────────────────────────── */
export const createOrUpdateProfile = async (req, res) => {
  try {
    const ngoId = req.user.id;
    const profile = await upsertNgoProfile(ngoId, req.body);
    return res.status(200).json({ message: "Profile saved successfully", profile });
  } catch (error) {
    console.error("NGO Profile Error:", error.message);
    return res.status(400).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────
   🖼️ Update Profile Picture
───────────────────────────────────────────────────── */
export const updateNGOProfilePicture = async (req, res) => {
  try {
    const ngoId = req.user.id;

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
      profilePicture: ngo.profilePicture,
    });
  } catch (error) {
    console.error("Error updating NGO profile picture:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ─────────────────────────────────────────────────────
   📁 Submit Documents
───────────────────────────────────────────────────── */
export const submitDocuments = async (req, res) => {
  try {
    const ngoId = req.user.id;

    if (!ngoId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.files.trustDeed || !req.files.certificate80G || !req.files.panCard) {
      return res.status(400).json({ success: false, message: "Required documents missing" });
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
      verified: false,
    });

    return res.json({
      success: true,
      message: "Documents submitted successfully for verification",
      documents: newDocs,
    });
  } catch (error) {
    console.error("Document Submission Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting documents",
      error: error.message,
    });
  }
};

/* ─────────────────────────────────────────────────────
   📄 Get Document Status
───────────────────────────────────────────────────── */
export const getDocumentStatus = async (req, res) => {
  try {
    const ngoId = req.user.id;

    const docs = await NgoDocument.findOne({ ngoId });
    const ngo = await Ngo.findById(ngoId).select("status verified");

    if (!docs) {
      return res.status(404).json({ message: "No documents submitted yet" });
    }

    return res.status(200).json({
      ngoStatus: ngo.status,
      verified: ngo.verified,
      documentsSubmitted: docs.isSubmitted,
      submittedAt: docs.createdAt,
      documents: {
        trustDeed: !!docs.trustDeed,
        certificate80G: !!docs.certificate80G,
        panCard: !!docs.panCard,
        registrationCertificate: !!docs.registrationCertificate,
        financialReport: !!docs.financialReport,
      },
    });
  } catch (error) {
    console.error("getDocumentStatus Error:", error);
    return res.status(500).json({ message: "Failed to fetch document status", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────
   👤 Get NGO (profile + docs)
───────────────────────────────────────────────────── */
export const getNgo = async (req, res) => {
  try {
    const ngoId = req.user.id;

    const ngo = await Ngo.findById(ngoId);
    if (!ngo) return res.status(404).json({ message: "NGO not found" });

    const profile = await NgoProfile.findOne({ ngo: ngo._id });
    const docs = await NgoDocument.findOne({ ngoId: ngo._id });

    if (!profile) return res.status(404).json({ message: "Profile not found" });

    return res.status(200).json({ ngo, profile, docs });
  } catch (error) {
    console.error("Error fetching NGO:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────
   🚩 Create Campaign
───────────────────────────────────────────────────── */

// helper: cleanup uploaded files on error
const cleanupFiles = (files) => {
  if (files?.length > 0) {
    files.forEach((file) => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
  }
};

// export const createCampaign = async (req, res) => {
//   try {
//     const ngoId = req.user.id;

//     // 1. Fetch NGO and check status
//     const ngo = await Ngo.findById(ngoId).select("status");
//     if (!ngo) {
//       cleanupFiles(req.files);
//       return res.status(404).json({ message: "NGO not found" });
//     }

//     if (ngo.status !== NGO_STATUS.APPROVED) {
//       cleanupFiles(req.files);
//       return res.status(403).json({ message: "Campaign creation allowed only for approved NGOs" });
//     }

//     // 2. Extract scalar fields
//     const { title, description, category, campaignType, startDate, endDate } = req.body || {};

//     // 3. Parse JSON fields from FormData
//     let address, monetary, volunteer, goods;
//     try {
//       address = req.body.address ? JSON.parse(req.body.address) : null;
//       monetary = req.body.monetary ? JSON.parse(req.body.monetary) : null;
//       volunteer = req.body.volunteer ? JSON.parse(req.body.volunteer) : null;
//       goods = req.body.goods ? JSON.parse(req.body.goods) : null;
//     } catch {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Invalid JSON in request fields" });
//     }

//     // 4. Required field validation
//     if (!title || !description || !category || !campaignType) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "title, description, category and campaignType are required" });
//     }

//     // 5. Date validation
//     if (!startDate || !endDate) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "startDate and endDate are required" });
//     }

//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     if (start >= end) {
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "End date must be after start date" });
//     }

//     // 6. Type-specific validation
//     if (campaignType === "MONETARY") {
//       if (!monetary?.targetAmount || !monetary?.minDonation) {
//         cleanupFiles(req.files);
//         return res.status(400).json({ message: "Monetary campaigns require targetAmount and minDonation" });
//       }
//     }

//     if (campaignType === "VOLUNTEER") {
//       if (!volunteer?.slotsAvailable || !volunteer?.commitmentType) {
//         cleanupFiles(req.files);
//         return res.status(400).json({ message: "Volunteer campaigns require slotsAvailable and commitmentType" });
//       }
//     }

//     if (campaignType === "GOODS") {
//       if (!goods?.quantityRequired || !goods?.goodsType?.length) {
//         cleanupFiles(req.files);
//         return res.status(400).json({ message: "Goods campaigns require goodsType and quantityRequired" });
//       }
//     }

//     // 7. Address + geocoding
//     let locationData = {};
//     if (address) {
//       const { city, state, country, landmark } = address;
//       if (!city || !state || !country) {
//         cleanupFiles(req.files);
//         return res.status(400).json({ message: "Address must include city, state, and country" });
//       }
//       const coordinates = await getCoordinatesFromAddress(`${city}, ${state}, ${country}`);
//       locationData = {
//         address: { city, state, country, landmark: landmark || null },
//         location: { type: "Point", coordinates },
//       };
//     }

//     // 8. Uploaded images — normalize paths
//     const uploadedImages =
//       req.files?.map((file) =>
//         file.path.replace(/\\/g, "/").replace(/^\.\//, "")
//       ) || [];

//     // 9. Urgency score
//     const today = new Date();
//     const daysLeft = Math.max(Math.ceil((end - today) / (1000 * 60 * 60 * 24)), 0);

//     // 10. Build campaign data
//     const campaignData = {
//       ngoId,
//       title,
//       description,
//       category,
//       campaignType,
//       startDate: start,
//       endDate: end,
//       images: uploadedImages,
//       urgencyScore: 1 / (1 + daysLeft),
//       ...locationData,
//     };

//     if (campaignType === "MONETARY") campaignData.monetary = monetary;
//     if (campaignType === "VOLUNTEER") campaignData.volunteer = volunteer;
//     if (campaignType === "GOODS") campaignData.goods = goods;

//     // 11. Save
//     const campaign = await Campaign.create(campaignData);

//     // 12. Async embedding
//     createCampaignEmbedding(campaign).catch((err) =>
//       console.error("Embedding creation failed:", campaign._id, err.message)
//     );

//     return res.status(201).json({ message: "Campaign created successfully", campaign });
//   } catch (error) {
//     cleanupFiles(req.files);
//     console.error("createCampaign Error:", error);
//     return res.status(500).json({ message: "Failed to create campaign", error: error.message });
//   }
// };


// export const createCampaign = async (req, res) => {
//   console.log("🚀 ===== CREATE CAMPAIGN REQUEST START =====");

//   try {
//     console.log("📦 RAW BODY:", req.body);
//     console.log("📸 FILES:", req.files);

//     const ngoId = req.user?.id;
//     console.log("👤 NGO ID:", ngoId);

//     // 1. NGO check
//     const ngo = await Ngo.findById(ngoId).select("status");
//     console.log("🏢 NGO:", ngo);

//     if (!ngo) {
//       console.log("❌ NGO NOT FOUND");
//       cleanupFiles(req.files);
//       return res.status(404).json({ message: "NGO not found" });
//     }

//     if (ngo.status !== NGO_STATUS.APPROVED) {
//       console.log("❌ NGO NOT APPROVED:", ngo.status);
//       cleanupFiles(req.files);
//       return res.status(403).json({ message: "Only approved NGOs allowed" });
//     }

//     // 2. Fields
//     const { title, description, category, campaignType, startDate, endDate } = req.body || {};
//     console.log("📝 BASIC FIELDS:", { title, description, category, campaignType });

//     // 3. JSON parse
//     let address, monetary, volunteer, goods;

//     try {
//       console.log("🔍 RAW address:", req.body.address);
//       console.log("🔍 RAW monetary:", req.body.monetary);

//       address = req.body.address ? JSON.parse(req.body.address) : null;
//       monetary = req.body.monetary ? JSON.parse(req.body.monetary) : null;
//       volunteer = req.body.volunteer ? JSON.parse(req.body.volunteer) : null;
//       goods = req.body.goods ? JSON.parse(req.body.goods) : null;

//       console.log("✅ PARSED address:", address);
//       console.log("✅ PARSED monetary:", monetary);

//     } catch (err) {
//       console.log("❌ JSON PARSE ERROR:", err.message);
//       console.log("❌ BAD DATA:", req.body);
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Invalid JSON in request fields" });
//     }

//     // 4. Validation
//     if (!title || !description || !category || !campaignType) {
//       console.log("❌ MISSING REQUIRED FIELDS");
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     if (!startDate || !endDate) {
//       console.log("❌ MISSING DATES");
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Dates required" });
//     }

//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     console.log("📅 START:", start, "END:", end);

//     if (isNaN(start) || isNaN(end)) {
//       console.log("❌ INVALID DATE FORMAT");
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     if (start >= end) {
//       console.log("❌ DATE LOGIC ERROR");
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "End date must be after start" });
//     }

//     // 5. FILE DEBUG (IMPORTANT)
//     if (!req.files || req.files.length === 0) {
//       console.log("⚠️ NO FILES RECEIVED");
//     } else {
//       console.log("📸 FILE COUNT:", req.files.length);
//       req.files.forEach((f, i) => {
//         console.log(`📷 File ${i}:`, {
//           originalname: f.originalname,
//           mimetype: f.mimetype,
//           path: f.path
//         });
//       });
//     }

//     // 6. Normalize images
//     const uploadedImages =
//       req.files?.map(file =>
//         file.path.replace(/\\/g, "/").replace(/^\.\//, "")
//       ) || [];

//     console.log("🖼️ FINAL IMAGE PATHS:", uploadedImages);

//     // 7. Build data
//     const campaignData = {
//       ngoId,
//       title,
//       description,
//       category,
//       campaignType,
//       startDate: start,
//       endDate: end,
//       images: uploadedImages,
//     };

//     if (campaignType === "MONETARY") campaignData.monetary = monetary;
//     if (campaignType === "VOLUNTEER") campaignData.volunteer = volunteer;
//     if (campaignType === "GOODS") campaignData.goods = goods;

//     console.log("📦 FINAL DATA:", campaignData);

//     // 8. Save
//     const campaign = await Campaign.create(campaignData);

//     console.log("✅ SAVED CAMPAIGN:", campaign._id);

//     return res.status(201).json({
//       message: "Campaign created successfully",
//       campaign
//     });

//   } catch (error) {
//     console.log("🔥 SERVER ERROR:", error.message);
//     console.log(error.stack);
//     cleanupFiles(req.files);

//     return res.status(500).json({
//       message: "Failed to create campaign",
//       error: error.message
//     });
//   }
// };

// export const createCampaign = async (req, res) => {
//   console.log("🚀 ===== CREATE CAMPAIGN REQUEST START =====");

//   try {
//     console.log("📦 RAW BODY:", req.body);
//     console.log("📸 FILES:", req.files);

//     const ngoId = req.user?.id;
//     console.log("👤 NGO ID:", ngoId);

//     // 1. NGO check
//     const ngo = await Ngo.findById(ngoId).select("status");
//     console.log("🏢 NGO:", ngo);

//     if (!ngo) {
//       console.log("❌ NGO NOT FOUND");
//       cleanupFiles(req.files);
//       return res.status(404).json({ message: "NGO not found" });
//     }

//     if (ngo.status !== NGO_STATUS.APPROVED) {
//       console.log("❌ NGO NOT APPROVED:", ngo.status);
//       cleanupFiles(req.files);
//       return res.status(403).json({ message: "Only approved NGOs allowed" });
//     }

//     // 2. Fields
//     const { title, description, category, campaignType, startDate, endDate } = req.body || {};
//     console.log("📝 BASIC FIELDS:", { title, description, category, campaignType });

//     // 3. JSON parse
//     let address, monetary, volunteer, goods;

//     try {
//       console.log("🔍 RAW address:", req.body.address);
//       console.log("🔍 RAW monetary:", req.body.monetary);

//       address  = req.body.address   ? JSON.parse(req.body.address)   : null;
//       monetary = req.body.monetary  ? JSON.parse(req.body.monetary)  : null;
//       volunteer = req.body.volunteer ? JSON.parse(req.body.volunteer) : null;
//       goods    = req.body.goods     ? JSON.parse(req.body.goods)     : null;

//       console.log("✅ PARSED address:", address);
//       console.log("✅ PARSED monetary:", monetary);

//     } catch (err) {
//       console.log("❌ JSON PARSE ERROR:", err.message);
//       console.log("❌ BAD DATA:", req.body);
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Invalid JSON in request fields" });
//     }

//     // 4. Location data
//     let locationData = {};
//     if (address) {
//       const { city, state, country, landmark } = address;
//       if (!city || !state || !country) {
//         cleanupFiles(req.files);
//         return res.status(400).json({ message: "Address must include city, state, and country" });
//       }
//       const coordinates = await getCoordinatesFromAddress(`${city}, ${state}, ${country}`);
//       locationData = {
//         address: { city, state, country, landmark: landmark || null },
//         location: { type: "Point", coordinates },
//       };
//       console.log("📍 LOCATION DATA:", locationData);
//     }

//     // 5. Validation
//     if (!title || !description || !category || !campaignType) {
//       console.log("❌ MISSING REQUIRED FIELDS");
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     if (!startDate || !endDate) {
//       console.log("❌ MISSING DATES");
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Dates required" });
//     }

//     const start = new Date(startDate);
//     const end   = new Date(endDate);

//     console.log("📅 START:", start, "END:", end);

//     if (isNaN(start) || isNaN(end)) {
//       console.log("❌ INVALID DATE FORMAT");
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "Invalid date format" });
//     }

//     if (start >= end) {
//       console.log("❌ DATE LOGIC ERROR");
//       cleanupFiles(req.files);
//       return res.status(400).json({ message: "End date must be after start" });
//     }

//     // 6. FILE DEBUG
//     if (!req.files || req.files.length === 0) {
//       console.log("⚠️ NO FILES RECEIVED");
//     } else {
//       console.log("📸 FILE COUNT:", req.files.length);
//       req.files.forEach((f, i) => {
//         console.log(`📷 File ${i}:`, {
//           originalname: f.originalname,
//           mimetype:     f.mimetype,
//           path:         f.path,
//         });
//       });
//     }

//     // 7. Normalize images
//     const uploadedImages =
//       req.files?.map(file =>
//         file.path.replace(/\\/g, "/").replace(/^\.\//, "")
//       ) || [];

//     console.log("🖼️ FINAL IMAGE PATHS:", uploadedImages);

//     // 8. Build data
//     const campaignData = {
//       ngoId,
//       title,
//       description,
//       category,
//       campaignType,
//       startDate: start,
//       endDate:   end,
//       images:    uploadedImages,
//       ...locationData,           // ← spreads address + location if present
//     };

//     if (campaignType === "MONETARY")  campaignData.monetary  = monetary;
//     if (campaignType === "VOLUNTEER") campaignData.volunteer = volunteer;
//     if (campaignType === "GOODS")     campaignData.goods     = goods;

//     console.log("📦 FINAL DATA:", campaignData);

//     // 9. Save
//     const campaign = await Campaign.create(campaignData);

//     console.log("✅ SAVED CAMPAIGN:", campaign._id);

//     return res.status(201).json({
//       message: "Campaign created successfully",
//       campaign,
//     });

//   } catch (error) {
//     console.log("🔥 SERVER ERROR:", error.message);
//     console.log(error.stack);
//     cleanupFiles(req.files);

//     return res.status(500).json({
//       message: "Failed to create campaign",
//       error:   error.message,
//     });
//   }
// };

export const createCampaign = async (req, res) => {
  console.log("🚀 ===== CREATE CAMPAIGN REQUEST START =====");

  try {
    console.log("📦 RAW BODY:", req.body);
    console.log("📸 FILES:", req.files);

    const ngoId = req.user?.id;
    console.log("👤 NGO ID:", ngoId);

    // 1. NGO check
    const ngo = await Ngo.findById(ngoId).select("status");
    console.log("🏢 NGO:", ngo);

    if (!ngo) {
      console.log("❌ NGO NOT FOUND");
      cleanupFiles(req.files);
      return res.status(404).json({ message: "NGO not found" });
    }

    if (ngo.status !== NGO_STATUS.APPROVED) {
      console.log("❌ NGO NOT APPROVED:", ngo.status);
      cleanupFiles(req.files);
      return res.status(403).json({ message: "Only approved NGOs allowed" });
    }

    // 2. Fields
    const { title, description, category, campaignType, startDate, endDate } = req.body || {};
    console.log("📝 BASIC FIELDS:", { title, description, category, campaignType });

    // 3. JSON parse
    let address, monetary, volunteer, goods;

    try {
      console.log("🔍 RAW address:", req.body.address);
      console.log("🔍 RAW monetary:", req.body.monetary);

      address   = req.body.address   ? JSON.parse(req.body.address)   : null;
      monetary  = req.body.monetary  ? JSON.parse(req.body.monetary)  : null;
      volunteer = req.body.volunteer ? JSON.parse(req.body.volunteer) : null;
      goods     = req.body.goods     ? JSON.parse(req.body.goods)     : null;

      console.log("✅ PARSED address:", address);
      console.log("✅ PARSED monetary:", monetary);

    } catch (err) {
      console.log("❌ JSON PARSE ERROR:", err.message);
      console.log("❌ BAD DATA:", req.body);
      cleanupFiles(req.files);
      return res.status(400).json({ message: "Invalid JSON in request fields" });
    }

    // 4. Location data
    let locationData = {};
    if (address) {
      const { city, state, country, landmark } = address;
      if (!city || !state || !country) {
        cleanupFiles(req.files);
        return res.status(400).json({ message: "Address must include city, state, and country" });
      }
      const coordinates = await getCoordinatesFromAddress(`${city}, ${state}, ${country}`);
      locationData = {
        address: { city, state, country, landmark: landmark || null },
        location: { type: "Point", coordinates },
      };
      console.log("📍 LOCATION DATA:", locationData);
    }

    // 5. Validation
    if (!title || !description || !category || !campaignType) {
      console.log("❌ MISSING REQUIRED FIELDS");
      cleanupFiles(req.files);
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!startDate || !endDate) {
      console.log("❌ MISSING DATES");
      cleanupFiles(req.files);
      return res.status(400).json({ message: "Dates required" });
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

    console.log("📅 START:", start, "END:", end);

    if (isNaN(start) || isNaN(end)) {
      console.log("❌ INVALID DATE FORMAT");
      cleanupFiles(req.files);
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (start >= end) {
      console.log("❌ DATE LOGIC ERROR");
      cleanupFiles(req.files);
      return res.status(400).json({ message: "End date must be after start" });
    }

    // 6. FILE DEBUG
    if (!req.files || req.files.length === 0) {
      console.log("⚠️ NO FILES RECEIVED");
    } else {
      console.log("📸 FILE COUNT:", req.files.length);
      req.files.forEach((f, i) => {
        console.log(`📷 File ${i}:`, {
          originalname: f.originalname,
          mimetype:     f.mimetype,
          path:         f.path,
        });
      });
    }

    // 7. Normalize images
    const uploadedImages =
      req.files?.map(file =>
        file.path.replace(/\\/g, "/").replace(/^\.\//, "")
      ) || [];

    console.log("🖼️ FINAL IMAGE PATHS:", uploadedImages);

    // 8. Urgency score
    const today    = new Date();
    const daysLeft = Math.max(Math.ceil((end - today) / (1000 * 60 * 60 * 24)), 0);
    const urgencyScore = 1 / (1 + daysLeft);
    console.log("⏱️ URGENCY SCORE:", urgencyScore, "| Days left:", daysLeft);

    // 9. Build campaign data
    const campaignData = {
      ngoId,
      title,
      description,
      category,
      campaignType,
      startDate:    start,
      endDate:      end,
      images:       uploadedImages,
      urgencyScore,
      ...locationData,
    };

    if (campaignType === "MONETARY")  campaignData.monetary  = monetary;
    if (campaignType === "VOLUNTEER") campaignData.volunteer = volunteer;
    if (campaignType === "GOODS")     campaignData.goods     = goods;

    console.log("📦 FINAL DATA:", campaignData);

    // 10. Save
    const campaign = await Campaign.create(campaignData);
    console.log("✅ SAVED CAMPAIGN:", campaign._id);

    // 11. Async embedding ingestion (fire-and-forget)
    createCampaignEmbedding(campaign).catch(err => {
      console.error("🔴 Embedding creation failed for campaign:", campaign._id, err.message);
    });

    return res.status(201).json({
      message: "Campaign created successfully",
      campaign,
    });

  } catch (error) {
    console.log("🔥 SERVER ERROR:", error.message);
    console.log(error.stack);
    cleanupFiles(req.files);

    return res.status(500).json({
      message: "Failed to create campaign",
      error:   error.message,
    });
  }
};
/* ─────────────────────────────────────────────────────
   🔍 Get Single Campaign
───────────────────────────────────────────────────── */
export const getCampaignById = async (req, res) => {
  try {
    const ngoId = req.user.id;
    const { id } = req.params;
    console.log(`Fetching campaign ${id} for NGO ${ngoId}`);
    const campaign = await Campaign.findOne({ _id: id, ngoId });
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found or unauthorized" });
    }

    return res.status(200).json({ campaign });
  } catch (error) {
    console.error("getCampaignById Error:", error);
    return res.status(500).json({ message: "Failed to fetch campaign", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────
   📋 Get All NGO Campaigns
───────────────────────────────────────────────────── */
export const getNgoCampaigns = async (req, res) => {
  try {
    const ngoId = req.user.id;
    console.log("Fetching campaigns for NGO ID:", ngoId);
    const campaigns = await Campaign.find({ ngoId }).sort({ createdAt: -1 });
    return res.status(200).json(campaigns);
  } catch (error) {
    console.error("getNgoCampaigns Error:", error);
    return res.status(500).json({ message: "Failed to fetch campaigns", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────
   ✏️ Update Campaign
───────────────────────────────────────────────────── */
export const updateCampaign = async (req, res) => {
  try {
    const ngoId = req.user.id;
    const { id } = req.params;

    const campaign = await Campaign.findOne({ _id: id, ngoId });
    if (!campaign) {
      cleanupFiles(req.files);
      return res.status(404).json({ message: "Campaign not found or unauthorized" });
    }

    if (campaign.status === "ACTIVE" || campaign.status === "COMPLETED") {
      cleanupFiles(req.files);
      return res.status(403).json({
        message: "Cannot edit an ACTIVE or COMPLETED campaign. Pause it first.",
      });
    }

    const allowedUpdates = [
      "title", "description", "category",
      "startDate", "endDate", "monetary", "volunteer", "goods",
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Re-geocode if address changed
    if (req.body.address) {
      const { city, state, country, landmark } = req.body.address;
      if (!city || !state || !country) {
        cleanupFiles(req.files);
        return res.status(400).json({ message: "Address must include city, state, and country" });
      }
      const coordinates = await getCoordinatesFromAddress(`${city}, ${state}, ${country}`);
      updates.address = { city, state, country, landmark: landmark || null };
      updates.location = { type: "Point", coordinates };
    }

    // Replace images if new ones uploaded
    if (req.files?.length > 0) {
      // Delete old images from disk
      if (campaign.images?.length > 0) {
        campaign.images.forEach((imgPath) => {
          const fullPath = `./${imgPath}`;
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        });
      }
      updates.images = req.files.map((file) =>
        file.path.replace(/\\/g, "/").replace(/^\.\//, "")
      );
    }

    const updated = await Campaign.findByIdAndUpdate(id, updates, { new: true });

    // Re-generate embedding async
    createCampaignEmbedding(updated).catch((err) =>
      console.error("Embedding update failed:", err.message)
    );

    return res.status(200).json({ message: "Campaign updated successfully", campaign: updated });
  } catch (error) {
    cleanupFiles(req.files);
    console.error("updateCampaign Error:", error);
    return res.status(500).json({ message: "Failed to update campaign", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────
   🗑️ Delete Campaign
───────────────────────────────────────────────────── */
export const deleteCampaign = async (req, res) => {
  try {
    const ngoId = req.user.id;
    const { id } = req.params;

    const campaign = await Campaign.findOne({ _id: id, ngoId });
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found or unauthorized" });
    }

    if (campaign.status === "ACTIVE") {
      return res.status(403).json({
        message: "Cannot delete an ACTIVE campaign. Pause or complete it first.",
      });
    }

    // Delete images from disk
    if (campaign.images?.length > 0) {
      campaign.images.forEach((imgPath) => {
        const fullPath = `./${imgPath}`;
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });
    }

    await Campaign.findByIdAndDelete(id);

    return res.status(200).json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("deleteCampaign Error:", error);
    return res.status(500).json({ message: "Failed to delete campaign", error: error.message });
  }
};

/* ─────────────────────────────────────────────────────
   🔄 Update Campaign Status
───────────────────────────────────────────────────── */
export const updateCampaignStatus = async (req, res) => {
  try {
    const ngoId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["ACTIVE", "PAUSED", "COMPLETED"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid campaign status" });
    }

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, ngoId },
      { status },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found or unauthorized" });
    }

    return res.status(200).json({ message: `Campaign status updated to ${status}`, campaign });
  } catch (error) {
    console.error("updateCampaignStatus Error:", error);
    return res.status(500).json({ message: "Failed to update campaign status", error: error.message });
  }
};




// Simple IFSC validation
const isValidIFSC = (ifsc) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

// Save or Update NGO Bank Details
export const saveBankDetails = async (req, res) => {
  try {
    const ngoId = req.user.id; // from auth middleware

    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName
    } = req.body;

    // 🔴 Basic Validation
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (!isValidIFSC(ifscCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code"
      });
    }

    // Check if already exists
    let bankDetails = await NgoBankDetails.findOne({ ngoId });

    if (bankDetails) {
      // Update existing
      bankDetails.accountHolderName = accountHolderName;
      bankDetails.accountNumber = accountNumber;
      bankDetails.ifscCode = ifscCode;
      bankDetails.bankName = bankName;

      await bankDetails.save();

      return res.json({
        success: true,
        message: "Bank details updated successfully",
        data: bankDetails
      });
    }

    // Create new
    bankDetails = await NgoBankDetails.create({
      ngoId,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName
    });

    return res.status(201).json({
      success: true,
      message: "Bank details saved successfully",
      data: bankDetails
    });

  } catch (error) {
    console.error("Error saving bank details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// export const saveBankDetails = async (req, res) => {
//   try {
//     const ngoId = req.user.id;

//     const {
//       accountHolderName,
//       accountNumber,
//       ifscCode,
//       bankName
//     } = req.body;

//     // 🔥 1. Fetch NGO Details (IMPORTANT)
//     const ngo = await Ngo.findById(ngoId);

//     if (!ngo) {
//       return res.status(404).json({ message: "NGO not found" });
//     }

//     let bankDetails = await NgoBankDetails.findOne({ ngoId });

//     if (!bankDetails) {
//       bankDetails = new NgoBankDetails({
//         ngoId,
//         accountHolderName,
//         accountNumber,
//         ifscCode,
//         bankName
//       });
//     } else {
//       // update existing
//       bankDetails.accountHolderName = accountHolderName;
//       bankDetails.accountNumber = accountNumber;
//       bankDetails.ifscCode = ifscCode;
//       bankDetails.bankName = bankName;
//     }

//     // ❗ Prevent duplicate Razorpay account creation
//     if (!bankDetails.razorpayAccountId) {

//       // 🔥 STEP 2: Create Linked Account using NGO data
//       const account = await razorpay.accounts.create({
//         email: ngo.email,                 // ✅ dynamic
//         phone: ngo.phone || "9999999999", // fallback if missing
//         type: "route",
//         reference_id: ngo._id.toString(),
//         legal_business_name: ngo.name,    // better than account holder
//         business_type: "ngo",
//         contact_name: ngo.name,
//         profile: {
//           category: "nonprofit"
//         }
//       });

//       // 🔥 STEP 3: Attach Bank Account
//       await razorpay.fundAccounts.create({
//         account_type: "bank_account",
//         bank_account: {
//           name: accountHolderName,
//           ifsc: ifscCode,
//           account_number: accountNumber
//         },
//         contact_id: account.id
//       });

//       // 🔥 Save Razorpay Account ID
//       bankDetails.razorpayAccountId = account.id;
//     }

//     await bankDetails.save();

//     res.json({
//       success: true,
//       message: bankDetails.razorpayAccountId
//         ? "Bank details saved & Razorpay linked"
//         : "Bank details saved",
//       data: bankDetails
//     });

//   } catch (error) {
//     console.error("Razorpay Error:", error?.response?.data || error);
//     res.status(500).json({
//       message: "Failed to setup Razorpay account",
//       error: error?.response?.data || error.message
//     });
//   }
// };
export const getbankDetails = async (req, res) => {
  try {
    const ngoId = req.user.id; // from auth middleware
    const bankDetails = await NgoBankDetails.findOne({ ngoId });

    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: "Bank details not found"
      });
    }
    return res.json({
      success: true,
      data: bankDetails
    });
  } catch (error) {
    console.error("Error fetching bank details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};