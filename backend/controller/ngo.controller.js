
import bcrypt from "bcrypt";
import crypto from "crypto";
import Ngo from "../models/ngo.model.js";
import NgoProfile from "../models/ngoProfile.model.js";
import NgoDocument from "../models/NgoDocument.model.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
    const profile = new NgoProfile({ ngo: newNgo._id, isCompleted: false });
    await profile.save();
   

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

    return res.status(200).json({ message: "Login successful", token, ngo });
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
// export const createProfile = async (req, res) => {
//   try {
//     const {
//       token,
//       description,
//       address,
//       phone,
//       registrationNumber,
//       mission,
//       focusAreas,
//       socialLinks,
//       preferences,
//       isCompleted,
//     } = req.body;

//     if (!token) return res.status(400).json({ message: "Token is required" });

//     const ngo = await Ngo.findOne({ token });
//     if (!ngo) return res.status(404).json({ message: "Invalid NGO" });

//     const existingProfile = await NgoProfile.findOne({ ngo: ngo._id });
//     if (existingProfile)
//       return res
//         .status(400)
//         .json({ message: "Profile already exists for this NGO" });

//     const profile = new NgoProfile({
//       ngo: ngo._id,
//       description,
//       address,
//       phone,
//       registrationNumber,
//       mission,
//       focusAreas,
//       socialLinks,
//       preferences,
//       isCompleted,
//     });

//     await profile.save();
//     return res
//       .status(201)
//       .json({ message: "Profile created successfully", profile });
//   } catch (error) {
//     console.error("Create Profile Error:", error);
//     return res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };



// export const createProfile = async (req, res) => {
//   try {
//     const {
//       token,
//       description,
//       address,
//       phone,
//       registrationNumber,
//       mission,
//       focusAreas,
//       socialLinks,
//       preferences,
//       urnNumber,
//     } = req.body;

//     if (!token) return res.status(400).json({ message: "Token is required" });

//     const ngo = await Ngo.findOne({ token });
//     if (!ngo) return res.status(404).json({ message: "Invalid NGO" });

//     const existingProfile = await NgoProfile.findOne({ ngo: ngo._id });
//     if (existingProfile)
//       return res.status(400).json({ message: "Profile already exists for this NGO" });

//     // Check URN uniqueness
//     if (urnNumber) {
//       const existingURN = await NgoProfile.findOne({ urnNumber });
//       if (existingURN)
//         return res.status(400).json({ message: "URN Number already exists" });
//     }

//     // Ensure focusAreas is always an array
//     const focusAreasArray = Array.isArray(focusAreas)
//       ? focusAreas
//       : focusAreas?.split(",").map(f => f.trim());

//     const profile = new NgoProfile({
//       ngo: ngo._id,
//       description,
//       address,
//       phone,
//       registrationNumber,
//       mission,
//       focusAreas: focusAreasArray,
//       socialLinks,
//       preferences,
//       isCompleted: true,
//       urnNumber,
//     });

//     await profile.save();

//     return res.status(201).json({
//       message: "Profile created successfully",
//       profile,
//     });
//   } catch (error) {
//     console.error("Create Profile Error:", error);
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };
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
      preferences,
      urnNumber,
    } = req.body;

    if (!token)
      return res.status(400).json({ message: "Token is required" });

    const ngo = await Ngo.findOne({ token });
    if (!ngo)
      return res.status(404).json({ message: "Invalid NGO" });

    // 🔍 Check for existing profile
    let profile = await NgoProfile.findOne({ ngo: ngo._id });

    // Ensure focusAreas is always an array
    const focusAreasArray = Array.isArray(focusAreas)
      ? focusAreas
      : focusAreas?.split(",").map(f => f.trim()).filter(Boolean);

    // 🔁 If profile exists, update it
    if (profile) {
      // Check for unique URN number if updated
      if (urnNumber && urnNumber !== profile.urnNumber) {
        const existingURN = await NgoProfile.findOne({ urnNumber });
        if (existingURN)
          return res.status(400).json({ message: "URN Number already exists" });
      }

      profile.description = description || profile.description;
      profile.address = address || profile.address;
      profile.phone = phone || profile.phone;
      profile.registrationNumber = registrationNumber || profile.registrationNumber;
      profile.mission = mission || profile.mission;
      profile.focusAreas = focusAreasArray || profile.focusAreas;
      profile.socialLinks = socialLinks || profile.socialLinks;
      profile.preferences = preferences || profile.preferences;
      profile.urnNumber = urnNumber || profile.urnNumber;
      profile.isCompleted = true;

      await profile.save();

      return res.status(200).json({
        message: "Profile updated successfully",
        profile,
      });
    }

    // 🆕 If no profile found, create one (fallback)
    profile = new NgoProfile({
      ngo: ngo._id,
      description,
      address,
      phone,
      registrationNumber,
      mission,
      focusAreas: focusAreasArray,
      socialLinks,
      preferences,
      isCompleted: true,
      urnNumber,
    });

    await profile.save();

    return res.status(201).json({
      message: "Profile created successfully",
      profile,
    });
  } catch (error) {
    console.error("Create/Update Profile Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
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
    const ngoId = req.user?._id || req.body.ngoId; // adjust if using JWT middleware
    if (!ngoId)
      return res
        .status(400)
        .json({ success: false, message: "NGO ID required" });

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
      registrationCertificate: req.files.registrationCertificate
        ? req.files.registrationCertificate[0].path
        : null,
      financialReport: req.files.financialReport
        ? req.files.financialReport[0].path
        : null,
      isSubmitted: true,
    });

    await newDocs.save();

    // Update NGO status to pending verification
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
export const getNgo = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }
    const ngo = await Ngo.findOne({ token });
    if (!ngo) {
      return res.status(404).json({ message: "NGO not found" });
    }

    const profile = await NgoProfile.findOne({ ngo: ngo._id });
    const docs =await NgoDocument.findOne({ ngoId: ngo._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(200).json({ ngo, profile ,docs});

  }catch (error) {
    console.error("Error fetching NGO:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}


// export const updateNGOProfilePicture = async (req, res) => {
//   try {
//     const { token } = req.body;

//     if (!token) return res.status(400).json({ message: 'Token is required' });
//     if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

//     const ngo = await Ngo.findOne({ token });
//     if (!ngo) return res.status(404).json({ message: 'NGO not found' });

//     // Optional: Delete old profile picture if not default
//     if (ngo.profilePicture && ngo.profilePicture !== 'default.jpg') {
//       const oldPath = `./uploads/documents/${ngo.profilePicture}`;
//       if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
//     }

//     ngo.profilePicture = req.file.filename;
//     await ngo.save();

//     return res.status(200).json({ 
//       message: 'Profile picture updated successfully', 
//       profilePicture: ngo.profilePicture 
//     });
//   } catch (error) {
//     console.error('Error updating NGO profile picture:', error);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };


export const updateNGOProfilePicture = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) return res.status(400).json({ message: 'Token is required' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const ngo = await Ngo.findOne({ token });
    if (!ngo) return res.status(404).json({ message: 'NGO not found' });

    // Optional: Delete old profile picture if not default
    if (ngo.profilePicture && ngo.profilePicture !== 'default.jpg') {
      const oldPath = `./uploads/${ngo.profilePicture}`;
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    ngo.profilePicture = req.file.filename;
    await ngo.save();

    return res.status(200).json({ 
      message: 'Profile picture updated successfully', 
      profilePicture: ngo.profilePicture 
    });
  } catch (error) {
    console.error('Error updating NGO profile picture:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


//Bank Account details controllers
export const saveBankDetails = async (req, res) => {
  try {
    const { ngoId } = req.user; // Assuming user ID is attached from auth middleware
    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchName
    } = req.body;

    // Validate required fields
    if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate account number format
    if (!/^\d{9,18}$/.test(accountNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account number format'
      });
    }

    // Validate IFSC code format
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IFSC code format'
      });
    }

    // Check if NGO exists
    const ngoExists = await NGO.findById(ngoId);
    if (!ngoExists) {
      return res.status(404).json({
        success: false,
        message: 'NGO not found'
      });
    }

    // Prepare bank data
    const bankData = {
      ngoId,
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      bankName: bankName.trim(),
      branchName: branchName ? branchName.trim() : '',
      isVerified: false
    };

    // Save or update bank details
    let bankDetails = await BankDetails.findOne({ ngoId });

    if (bankDetails) {
      // Update existing bank details
      bankDetails = await BankDetails.findOneAndUpdate(
        { ngoId },
        bankData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new bank details
      bankDetails = new BankDetails(bankData);
      await bankDetails.save();
    }

    // Update NGO hasBankDetails flag
    await NGO.findByIdAndUpdate(ngoId, { hasBankDetails: true });

    res.status(200).json({
      success: true,
      message: 'Bank details saved successfully',
      data: bankDetails
    });

  } catch (error) {
    console.error('Error saving bank details:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bank details already exist for this NGO'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get Bank Details
export const getBankDetails = async (req, res) => {
  try {
    const { ngoId } = req.user;

    const bankDetails = await BankDetails.findOne({ ngoId })
      .select('-razorpayContactId -razorpayFundAccountId');

    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: 'Bank details not found'
      });
    }

    res.status(200).json({
      success: true,
      data: bankDetails
    });

  } catch (error) {
    console.error('Error fetching bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update Bank Details
export const updateBankDetails = async (req, res) => {
  try {
    const { ngoId } = req.user;
    const updates = req.body;

    // Remove restricted fields
    delete updates.ngoId;
    delete updates.isVerified;
    delete updates.razorpayContactId;
    delete updates.razorpayFundAccountId;

    const bankDetails = await BankDetails.findOneAndUpdate(
      { ngoId },
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: 'Bank details not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bank details updated successfully',
      data: bankDetails
    });

  } catch (error) {
    console.error('Error updating bank details:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete Bank Details
export const deleteBankDetails = async (req, res) => {
  try {
    const { ngoId } = req.user;

    const bankDetails = await BankDetails.findOneAndDelete({ ngoId });

    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: 'Bank details not found'
      });
    }

    // Update NGO hasBankDetails flag
    await NGO.findByIdAndUpdate(ngoId, { hasBankDetails: false });

    res.status(200).json({
      success: true,
      message: 'Bank details deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};