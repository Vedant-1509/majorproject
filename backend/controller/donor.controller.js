import bcrypt from "bcrypt";
import crypto from "crypto";
import Donor from "../models/donor.model.js";
import donorProfile from "../models/donarProfile.model.js";




export const donorhello = (req, res) => {
  res.send("Hello from donor controller");
}

export const register = async (req, res) => {
    try {
        const {name, email, password } = req.body;
        
        if (!name || !password || !email) {
            return res.status(400).json({ message: "All field are required" });
        }
        const user = await Donor.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "USer already exist" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Donor({
            name,
            email,
            password: hashedPassword,
            role: "donor"
        })
        await newUser.save();
        const profile = new donorProfile({ userId: newUser._id })
        await profile.save();
        return res.status(201).json({ message: "User created successfully" })
    } catch (error) {
        console.log("BODY:", req.body);
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message })
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
        return res.status(200).json({ message: "Login successful", token })
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", error: error.messag })
    }

}

export const createProfile = async (req, res) => {
  try {
    const {
      token,
      bio,
      address,
      phone,
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
      address,
      phone,
      skills: skills || [],
      interests: interests || [],
      availability: availability || "anytime",
      preferences: preferences || {},
      bloodType: bloodType || null,
      lastBloodDonationDate: lastBloodDonationDate || null,
      participationScore: 0,
      isCompleted: true
    });

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
