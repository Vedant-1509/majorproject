import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Donor from "../models/donor.model.js";
import donorProfile from "../models/donarProfile.model.js";
import Campaign from "../models/campaign.model.js";
import Interaction from "../models/Interaction.model.js";
import UserInterestProfile from "../models/UserInterestProfile.js";
import { getCandidateCampaigns } from "../services/similairitySearchService.js";
import {getCoordinatesFromAddress} from "../services/geocode.service.js";
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

export const upsertProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, skills, interests, donationTypes, preferences, ...rest } = req.body;

    const updateData = { ...rest };

    // 📍 Address + Geocoding
    if (address) {
      const { city, state, country, landmark } = address;

      if (!city || !state || !country) {
        return res.status(400).json({
          message: "Address must include city, state, and country",
        });
      }

      const fullAddress = `${city}, ${state}, ${country}`;
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

    // 🧠 Skills validation (new structure)
    if (skills) {
      updateData.skills = skills.map((skill) => ({
        name: skill.name,
        level: skill.level || "beginner",
      }));
    }

    // ❤️ Interests (direct assign - enum handled by mongoose)
    if (interests) {
      updateData.interests = interests;
    }

    // 💰 Donation Types
    if (donationTypes) {
      updateData.donationTypes = donationTypes;
    }

    // ⚙️ Preferences
    if (preferences) {
      updateData.preferences = {
        volunteerInvolvement: preferences.volunteerInvolvement ?? false,
        monetaryDonation: preferences.monetaryDonation ?? false,
        donationCategories: preferences.donationCategories || [],
        preferredFrequency: preferences.preferredFrequency || "one-time",
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

    // ♻️ Update profile
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
    const userId = req.user.id;
    const user = await Donor.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = await donorProfile.findOne({ userId: user._id });
    return res.status(200).json({ user, profile });
  }
  catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


export const updateProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const donor = await Donor.findById(userId);
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

const logImpressions = async (userId, campaigns) => {
  try {
    if (!campaigns || campaigns.length === 0) return;

    const events = campaigns.map((item, index) => {
      const campaign = item.campaign || item;
      const features = item.features || {};

      return {
        userId,
        campaignId: campaign._id,

        // ✅ LTR LABEL
        action: "impression",

        // ✅ CRITICAL: snapshot features
        features: {
          campaignType: features.campaignType || campaign.campaignType,
          semanticScore: features.semanticScore || 0,
          categoryScore: features.categoryScore || 0,
          locationScore: features.locationScore || 0,
          distance: features.distance || 0,
          urgencyScore: features.urgencyScore || 0
        },

        // ✅ CONTEXT
        context: {
          category: campaign.category
        },

        // ✅ POSITION BIAS
        rankPosition: index + 1,

        createdAt: new Date()
      };
    });

    // 🚀 single DB call
    await Interaction.insertMany(events);
    updateUserInterestProfile(userId)
  } catch (error) {
    console.error("Impression logging error:", error);
  }
};

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


// export const logClickEvent = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { campaignId } = req.body;

//     if (!campaignId) {
//       return res.status(400).json({ message: "campaignId is required" });
//     }

//     const campaignCategory = await getCampaignCategory(campaignId);

//     await InteractionEvent.create({
//       userId,
//       campaignId,
//       campaignCategory,
//       eventType: "CLICK"
//     });

//     res.sendStatus(200);
//     console.log("Response sent, starting background update");

//     updateUserInterestProfile(userId)
//       .then(() => console.log("Interest profile updated successfully"))
//       .catch(err => console.error("Interest profile update failed:", err));

//   } catch (error) {
//     res.status(error.message === "Campaign not found" ? 404 : 500).json({
//       message: "Failed to log click event",
//       error: error.message
//     });
//   }
// };

export const logClickEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId, features, rankPosition } = req.body;

    const campaign = await Campaign.findById(campaignId)
      .select("category campaignType")
      .lean();

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    await Interaction.create({
      userId,
      campaignId,
      action: "click",

      features: features || {}, // ✅ send from frontend
      context: {
        category: campaign.category
      },

      rankPosition
    });

    res.sendStatus(200);

  } catch (error) {
    res.status(500).json({
      message: "Failed to log click",
      error: error.message
    });
  }
};


// export const logDonationEvent = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { campaignId, amount } = req.body;

//     if (!campaignId || !amount) {
//       return res.status(400).json({
//         message: "campaignId and amount required"
//       });
//     }

//     const campaignCategory = await getCampaignCategory(campaignId);

//     await InteractionEvent.create({
//       userId,
//       campaignId,
//       campaignCategory,
//       eventType: "DONATION",
//       metadata: { amount }
//     });

//     res.sendStatus(200);
//     console.log("Response sent, starting background update");

//     updateUserInterestProfile(userId)
//       .then(() => console.log("Interest profile updated successfully"))
//       .catch(err => console.error("Interest profile update failed:", err));

//   } catch (error) {
//     res.status(error.message === "Campaign not found" ? 404 : 500).json({
//       message: "Failed to log donation event",
//       error: error.message
//     });
//   }
// };

export const logDonationEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId, amount, features, rankPosition } = req.body;

    const campaign = await Campaign.findById(campaignId)
      .select("category")
      .lean();

    await Interaction.create({
      userId,
      campaignId,
      action: "donate",

      features: features || {},

      context: {
        category: campaign.category
      },

      rankPosition
    });

    res.sendStatus(200);

  } catch (error) {
    res.status(500).json({
      message: "Failed to log donation",
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

// export const updateUserInterestProfile = async (userId) => {
//   const events = await InteractionEvent.find({ userId })
//     .sort({ createdAt: -1 })
//     .limit(50)
//     .lean();

//   const categoryScores = {};

//   for (const event of events) {
//     const baseWeight = EVENT_WEIGHTS[event.eventType];
//     if (!baseWeight || !event.campaignCategory) continue;

//     let weight = baseWeight;

//     // extra strength for donation amount
//     if (event.eventType === "DONATION" && event.metadata?.amount) {
//       weight *= Math.log(event.metadata.amount + 1);
//     }

//     categoryScores[event.campaignCategory] =
//       (categoryScores[event.campaignCategory] || 0) + weight;
//   }

//   if (Object.keys(categoryScores).length === 0) {
//     return {};
//   }

//   const maxScore = Math.max(...Object.values(categoryScores));
//   const normalizedScores = {};

//   for (const category in categoryScores) {
//     normalizedScores[category] = categoryScores[category] / maxScore;
//   }

//   await UserInterestProfile.findOneAndUpdate(
//     { userId },
//     {
//       categoryScores: normalizedScores,
//       updatedAt: new Date()
//     },
//     { upsert: true }
//   );

//   return normalizedScores;
// };
export const updateUserInterestProfile = async (userId) => {
  console.log("Updating interest profile for user:", userId);
  const events = await Interaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  if (!events.length) return {};

  const categoryScores = {};
  const campaignTypeScores = {};
  const featurePreference = {
    semantic: 0,
    urgency: 0,
    location: 0
  };

  const now = Date.now();

  for (const event of events) {
    const { action, context, features, rankPosition, createdAt } = event;

    if (!context?.category) continue;

    // 🎯 BASE WEIGHT (VERY IMPORTANT)
    let weight =
      action === "impression" ? 0.2 :
      action === "click" ? 1 :
      action === "donate" ? 3 :
      0;

    // 🧠 POSITION BIAS (top items matter more)
    if (rankPosition) {
      weight *= 1 / Math.log2(rankPosition + 1);
    }

    // ⏳ TIME DECAY (recent actions matter more)
    const ageInDays = (now - new Date(createdAt)) / (1000 * 60 * 60 * 24);
    const decay = Math.exp(-0.05 * ageInDays); // tweakable
    weight *= decay;

    // 📊 CATEGORY SCORE
    categoryScores[context.category] =
      (categoryScores[context.category] || 0) + weight;

    // 📊 CAMPAIGN TYPE SCORE
    if (features?.campaignType) {
      campaignTypeScores[features.campaignType] =
        (campaignTypeScores[features.campaignType] || 0) + weight;
    }

    // 📊 FEATURE PREFERENCES (behavior learning)
    if (features) {
      featurePreference.semantic += weight * (features.semanticScore || 0);
      featurePreference.urgency += weight * (features.urgencyScore || 0);
      featurePreference.location += weight * (features.locationScore || 0);
    }
  }

  // 🔥 NORMALIZATION FUNCTION
  const normalize = (obj) => {
    const max = Math.max(...Object.values(obj), 1);
    const result = {};
    for (const key in obj) {
      result[key] = obj[key] / max;
    }
    return result;
  };

  const normalizedCategory = normalize(categoryScores);
  const normalizedCampaignType = normalize(campaignTypeScores);

  const totalFeatureWeight =
    featurePreference.semantic +
    featurePreference.urgency +
    featurePreference.location;

  const normalizedFeatures = {
    semantic: featurePreference.semantic / (totalFeatureWeight || 1),
    urgency: featurePreference.urgency / (totalFeatureWeight || 1),
    location: featurePreference.location / (totalFeatureWeight || 1)
  };

  // 💾 SAVE PROFILE
  const profile = await UserInterestProfile.findOneAndUpdate(
    { userId },
    {
      categoryScores: normalizedCategory,
      campaignTypeScores: normalizedCampaignType,
      featurePreference: normalizedFeatures,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return profile;
};

// export const donorRecommendations = async (req, res, next) => {
//   try {
//     const userId = req.user.id;
//     console.log("Fetching recommendations for user:", userId);
//     const campaigns = await getCandidateCampaigns(userId);

//     return res.status(200).json({
//       success: true,
//       data: campaigns
//     });
//   } catch (err) {
//     next(err);
//   }
// };


export const donorRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const campaigns = await getCandidateCampaigns(userId);

    // ✅ send response first (fast)
    res.status(200).json({
      success: true,
      data: campaigns
    });

    // ✅ async impression logging
    logImpressions(userId, campaigns)
      .then(() => console.log("Impressions logged"))
      .catch(err => console.error("Impression logging failed:", err));

  } catch (err) {
    next(err);
  }
};


export const logUserInteraction = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { campaignId, action, features, rankPosition } = req.body;

    // 🔹 Validation
    if (!campaignId || !action || !features) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    if (!["click", "donate"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action"
      });
    }

    // 🔹 Optional: validate campaign exists
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    // 🔥 Store interaction
    await Interaction.create({
      userId,
      campaignId,
      action,
      features,
      context: {
        category: campaign.category,
        city: campaign?.address?.city || null
      },
      rankPosition
    });

    return res.status(201).json({
      success: true,
      message: "Interaction logged successfully"
    });

  } catch (error) {
    console.error("Error logging interaction:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};