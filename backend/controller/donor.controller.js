import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Donor from "../models/donor.model.js";
import donorProfile from "../models/donarProfile.model.js";
import Campaign from "../models/campaign.model.js";
import InteractionEvent from "../models/InteractionEvent.js";
import UserInterestProfile from "../models/UserInterestProfile.js";
import { getCandidateCampaigns } from "../services/similairitySearchService.js";
import {getCoordinatesFromAddress} from "../services/geocode.service.js ";
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
}//done

export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, mobileNumber } = req.body;

    if (!name || !email || !password || !confirmPassword || !mobileNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await Donor.findOne({
      $or: [{ email }, { mobileNumber }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Donor.create({
      name,
      email,
      password: hashedPassword,
      mobileNumber,
      role: "donor",
    });

    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};//done

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await Donor.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};//done

// export const createProfile = async (req, res) => {
//   try {
//     const {
//       token,
//       bio,
//       PAN,
//       address,
//       skills,
//       interests,
//       availability,
//       preferences,
//       bloodType,
//       lastBloodDonationDate
//     } = req.body;

//     if (!token) {
//       return res.status(400).json({ message: "Token is required" });
//     }

//     // Find user by token
//     const user = await Donor.findOne({ token });
//     if (!user) {
//       return res.status(404).json({ message: "Invalid user" });
//     }

//     // Check if profile already exists
//     const existing = await donorProfile.findOne({ userId: user._id });
//     if (existing) {
//       return res.status(400).json({ message: "Profile already exists for this user" });
//     }

//     const profile = new donorProfile({
//       userId: user._id,
//       bio: bio || "",
//       PAN: PAN || "",
//       address,
//       skills: skills || [],
//       interests: interests || [],
//       availability: availability || "anytime",
//       preferences: preferences || {},
//       bloodType: bloodType || null,
//       lastBloodDonationDate: lastBloodDonationDate || null,
//       participationScore: 0,
//       isCompleted: true
//     });

//     user.isCompleted = true;
//     await user.save();

//     await profile.save();

//     return res.status(201).json({ message: "Profile created successfully", profile });
//   } catch (error) {
//     console.error("Error creating profile:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };

// export const upsertProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const {
//       bio,
//       PAN,
//       address,
//       skills,
//       interests,
//       availability,
//       preferences,
//       bloodType,
//       lastBloodDonationDate,
//     } = req.body;

//     const updateData = {};

//     if (bio !== undefined) updateData.bio = bio;
//     if (PAN !== undefined) updateData.PAN = PAN;
//     if (address !== undefined) updateData.address = address;
//     if (skills !== undefined) updateData.skills = skills;
//     if (interests !== undefined) updateData.interests = interests;
//     if (availability !== undefined) updateData.availability = availability;
//     if (preferences !== undefined) updateData.preferences = preferences;
//     if (bloodType !== undefined) updateData.bloodType = bloodType;
//     if (lastBloodDonationDate !== undefined)
//       updateData.lastBloodDonationDate = lastBloodDonationDate;

//     let profile = await donorProfile.findOne({ userId });

//     // CREATE
//     if (!profile) {
//       profile = await donorProfile.create({
//         userId,
//         ...updateData,
//         participationScore: 0,
//         isCompleted: true,
//       });

//       // ONE user update, no fetch needed
//       await Donor.findByIdAndUpdate(userId, { isCompleted: true });

//       return res.status(201).json({
//         message: "Profile created successfully",
//         profile,
//       });
//     }

//     // UPDATE (no user DB call at all)
//     Object.assign(profile, updateData, { updatedAt: Date.now() });
//     await profile.save();

//     return res.status(200).json({
//       message: "Profile updated successfully",
//       profile,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

// export const upsertProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { address, ...rest } = req.body;

//     const updateData = { ...rest };

//     if (address) {
//       const { latitude, longitude } = await geocodeAddress(address);

//       updateData.address = address;
//       updateData.location = {
//         type: "Point",
//         coordinates: [longitude, latitude],
//       };
//     }

//     let profile = await donorProfile.findOne({ userId });

//     if (!profile) {
//       if (!updateData.location) {
//         return res.status(400).json({
//           message: "Address is required to create profile",
//         });
//       }

//       profile = await donorProfile.create({
//         userId,
//         ...updateData,
//       });

//       await Donor.findByIdAndUpdate(userId, { isCompleted: true });

//       return res.status(201).json({
//         message: "Profile created successfully",
//         profile,
//       });
//     }

//     Object.assign(profile, updateData);
//     await profile.save();

//     return res.status(200).json({
//       message: "Profile updated successfully",
//       profile,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: error.message,
//     });
//   }
// };

// export const upsertProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { address, ...rest } = req.body;

//     const updateData = { ...rest };

//     if (address) {
//       //const addressString = buildAddressString(address);

//       const { latitude, longitude } = await geocodeAddress(address);

//       updateData.address = {
//         city: address.city,
//         state: address.state,
//         country: address.country,
//       };

//       updateData.location = {
//         type: "Point",
//         coordinates: [longitude, latitude],
//       };
//     }

//     let profile = await donorProfile.findOne({ userId });

//     if (!profile) {
//       if (!updateData.location) {
//         return res.status(400).json({
//           message: "Address (city, state, country) is required to create profile",
//         });
//       }

//       profile = await donorProfile.create({
//         userId,
//         ...updateData,
//       });

//       await Donor.findByIdAndUpdate(userId, { isCompleted: true });

//       return res.status(201).json({
//         message: "Profile created successfully",
//         profile,
//       });
//     }

//     Object.assign(profile, updateData);
//     await profile.save();

//     return res.status(200).json({
//       message: "Profile updated successfully",
//       profile,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: error.message,
//     });
//   }
// };

// export const upsertProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { address, ...rest } = req.body;

//     const updateData = { ...rest };

//     // 📍 Address handling (NO geocoding)
//     if (address) {
//       updateData.address = {
//         city: address.city,
//         state: address.state,
//         country: address.country,
//         landmark: address.landmark || null,
//       };
//     }

//     let profile = await donorProfile.findOne({ userId });

//     // 🆕 Create profile
//     if (!profile) {
//       if (
//         !address?.city ||
//         !address?.state ||
//         !address?.country
//       ) {
//         return res.status(400).json({
//           message: "Address (city, state, country) is required to create profile",
//         });
//       }

//       profile = await donorProfile.create({
//         userId,
//         ...updateData,
//       });

//       await Donor.findByIdAndUpdate(userId, { isCompleted: true });

//       return res.status(201).json({
//         message: "Profile created successfully",
//         profile,
//       });
//     }

//     // ♻️ Update profile (partial updates allowed)
//     Object.assign(profile, updateData);
//     await profile.save();

//     return res.status(200).json({
//       message: "Profile updated successfully",
//       profile,
//     });
//   } catch (error) {
//     console.error("Error in upsertProfile:", error);
//     return res.status(500).json({
//       message: error.message,
//     });
//   }
// };

export const upsertProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, ...rest } = req.body;

    const updateData = { ...rest };

    // 📍 Address + Geocoding
    if (address) {
      const { city, state, country, landmark } = address;

      if (!city || !state || !country) {
        return res.status(400).json({
          message: "Address must include city, state, and country",
        });
      }

      // 🔥 Convert to string for geocoding
      const fullAddress = `${city}, ${state}, ${country}`;

      // 🔥 Get coordinates
      const coordinates = await getCoordinatesFromAddress(fullAddress);

      updateData.address = {
        city,
        state,
        country,
        landmark: landmark || null,
      };

      updateData.location = {
        type: "Point",
        coordinates, // [lng, lat]
      };
    }

    let profile = await donorProfile.findOne({ userId });

    // 🆕 Create profile
    if (!profile) {
      if (!address?.city || !address?.state || !address?.country) {
        return res.status(400).json({
          message:
            "Address (city, state, country) is required to create profile",
        });
      }

      profile = await donorProfile.create({
        userId,
        ...updateData,
      });

      await Donor.findByIdAndUpdate(userId, { isCompleted: true });

      return res.status(201).json({
        message: "Profile created successfully",
        profile,
      });
    }

    // ♻️ Update profile (partial updates allowed)
    Object.assign(profile, updateData);
    await profile.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Error in upsertProfile:", error);
    return res.status(500).json({
      message: error.message,
    });
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

//to be done: add profile picture update, and also add delete old picture if not default
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
    return res.status(200).json({ user, profile });
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



//logging users actions: view, click
// export const logViewEvent = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { campaignId } = req.body;

//     if (!campaignId) {
//       return res.status(400).json({ message: "campaignId is required" });
//     }

//     // Optional: ensure campaign exists & is active
//     const campaign = await Campaign.findOne({
//       _id: campaignId,
//       status: "ACTIVE"
//     }).select("_id");

//     if (!campaign) {
//       return res.status(404).json({ message: "Campaign not found or inactive" });
//     }

//     await InteractionEvent.create({
//       userId,
//       campaignId,
//       eventType: "VIEW"
//     });

//     res.sendStatus(200);
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to log view event",
//       error: error.message
//     });
//   }
// };

// export const logClickEvent = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { campaignId } = req.body;

//     if (!campaignId) {
//       return res.status(400).json({ message: "campaignId is required" });
//     }

//     await InteractionEvent.create({
//       userId,
//       campaignId,
//       eventType: "CLICK"
//     });

//     res.sendStatus(200);
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to log click event",
//       error: error.message
//     });
//   }
// };

const getCampaignCategory = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId).select("category").lean();
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  return campaign.category;
};


export const logClickEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ message: "campaignId is required" });
    }

    const campaignCategory = await getCampaignCategory(campaignId);

    await InteractionEvent.create({
      userId,
      campaignId,
      campaignCategory,
      eventType: "CLICK"
    });

    res.sendStatus(200);
    console.log("Response sent, starting background update");

    updateUserInterestProfile(userId)
      .then(() => console.log("Interest profile updated successfully"))
      .catch(err => console.error("Interest profile update failed:", err));

  } catch (error) {
    res.status(error.message === "Campaign not found" ? 404 : 500).json({
      message: "Failed to log click event",
      error: error.message
    });
  }
};




export const logDonationEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId, amount } = req.body;

    if (!campaignId || !amount) {
      return res.status(400).json({
        message: "campaignId and amount required"
      });
    }

    const campaignCategory = await getCampaignCategory(campaignId);

    await InteractionEvent.create({
      userId,
      campaignId,
      campaignCategory,
      eventType: "DONATION",
      metadata: { amount }
    });

    res.sendStatus(200);
    console.log("Response sent, starting background update");

    updateUserInterestProfile(userId)
      .then(() => console.log("Interest profile updated successfully"))
      .catch(err => console.error("Interest profile update failed:", err));

  } catch (error) {
    res.status(error.message === "Campaign not found" ? 404 : 500).json({
      message: "Failed to log donation event",
      error: error.message
    });
  }
};



const EVENT_WEIGHTS = {
  IMPRESSION: 0.5,
  VIEW: 1,
  CLICK: 2,
  DONATION: 5
};

export const updateUserInterestProfile = async (userId) => {
  const events = await InteractionEvent.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const categoryScores = {};

  for (const event of events) {
    const baseWeight = EVENT_WEIGHTS[event.eventType];
    if (!baseWeight || !event.campaignCategory) continue;

    let weight = baseWeight;

    // extra strength for donation amount
    if (event.eventType === "DONATION" && event.metadata?.amount) {
      weight *= Math.log(event.metadata.amount + 1);
    }

    categoryScores[event.campaignCategory] =
      (categoryScores[event.campaignCategory] || 0) + weight;
  }

  if (Object.keys(categoryScores).length === 0) {
    return {};
  }

  const maxScore = Math.max(...Object.values(categoryScores));
  const normalizedScores = {};

  for (const category in categoryScores) {
    normalizedScores[category] = categoryScores[category] / maxScore;
  }

  await UserInterestProfile.findOneAndUpdate(
    { userId },
    {
      categoryScores: normalizedScores,
      updatedAt: new Date()
    },
    { upsert: true }
  );

  return normalizedScores;
};


export const donorRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const campaigns = await getCandidateCampaigns(userId);

    return res.status(200).json({
      success: true,
      data: campaigns
    });
  } catch (err) {
    next(err);
  }
};
