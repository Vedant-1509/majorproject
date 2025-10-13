import bcrypt from "bcrypt";
import crypto from "crypto";
import Donor from "../models/donor.model.js";
import donorProfile from "../models/donarProfile.model.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/donor';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });

export const donorhello = (req, res) => {
  res.send("Hello from donor controller");
}

export const register = async (req, res) => {
    try {
        const { name, email, password, confirmPassword, mobileNumber } = req.body;

        if (!name || !password || !email || !confirmPassword || !mobileNumber) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Password and Confirm Password do not match" });
        }
         const existingUser = await Donor.findOne({
            $or: [{ email }, { mobileNumber }]
        });

        const user = await Donor.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new Donor({
            name,
            email,
            password: hashedPassword,
            mobileNumber,
            role: "donor"
        });
        
        await newUser.save();
        
        return res.status(201).json({ message: "User created successfully" });

    } catch (error) {
        console.log("BODY:", req.body);
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = await Donor.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Invalid email or password" });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(404).json({ message: "Invalid email or password" });
        }

        const token = crypto.randomBytes(32).toString("hex")
        await Donor.updateOne({ _id: user._id }, { token })
        return res.status(200).json({ message: "Login successful", token, user})
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", error: error.messag })
    }

}

export const createProfile = async (req, res) => {
  try {
    const {
      token,
      bio,
      PAN,
      address,
      skills,
      interests,
      availability,
      preferences,
      bloodType,
      lastBloodDonationDate
    } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Find user by token
    const user = await Donor.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "Invalid user" });
    }

    // Check if profile already exists
    const existing = await donorProfile.findOne({ userId: user._id });
    if (existing) {
      return res.status(400).json({ message: "Profile already exists for this user" });
    }

    const profile = new donorProfile({
      userId: user._id,
      bio: bio || "",
      PAN: PAN || "",
      address,
      skills: skills || [],
      interests: interests || [],
      availability: availability || "anytime",
      preferences: preferences || {},
      bloodType: bloodType || null,
      lastBloodDonationDate: lastBloodDonationDate || null,
      participationScore: 0,
      isCompleted: true
    });

    user.isCompleted = true;
    await user.save();

    await profile.save();

    return res.status(201).json({ message: "Profile created successfully", profile });
  } catch (error) {
    console.error("Error creating profile:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { token, ...updateData } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // find user by token
    const user = await Donor.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "Invalid user" });
    }

    // find existing profile
    const profile = await donorProfile.findOne({ userId: user._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // merge updates into profile
    Object.assign(profile, updateData, { updatedAt: Date.now() });

    await profile.save();
    return res.status(200).json({ message: "Profile updated successfully", profile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


export const getUser = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }
    // find user by token
    const user = await Donor.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "Invalid user" });
    }
    
    const profile = await donorProfile.findOne({ userId: user._id });
    if (profile) {
      user.profile = profile; // attach profile to user object
    }
    return res.status(200).json({ user ,profile});
  }
  catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


export const updateProfilePicture = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) return res.status(400).json({ message: 'Token is required' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const donor = await Donor.findOne({ token });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    // Optional: Delete old profile picture if not default
    if (donor.profilepicture && donor.profilepicture !== 'default.jpg') {
      const oldPath = `./uploads/${donor.profilepicture}`;
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    donor.profilepicture = req.file.filename;
    await donor.save();

    return res.status(200).json({ message: 'Profile picture updated successfully', profilePicture: donor.profilepicture });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};