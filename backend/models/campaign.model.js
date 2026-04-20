import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    // 🔗 NGO who owns the campaign
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NGO",
      required: true,
      index: true
    },

    // 🏷️ Basic info
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    // 📂 Category
    category: {
      type: String,
      enum: [
        // Healthcare & Emergency
        "Healthcare",
        "Mental Health Support",
        "Disability Support",
        "Nutrition & Hunger Relief",
        "Disaster Relief",
        "Emergency Medical Response",
        "Pandemic & Epidemic Support",

        // Education
        "Education",
        "Scholarships & Higher Education",
        "Skill Development & Vocational Training",
        "Digital Literacy",

        // Social Welfare
        "Child Welfare",
        "Orphan Care",
        "Women Empowerment",
        "Elderly Care",
        "Homelessness Support",

        // Animal & Environment
        "Animal Welfare",
        "Wildlife Conservation",
        "Stray Animal Support",
        "Environment",
        "Climate Change Action",
        "Afforestation & Tree Plantation",
        "Water Conservation",
        "Renewable Energy & Sustainability",

        // Poverty & Development
        "Rural Development",
        "Urban Poverty Alleviation",
        "Slum Development",
        "Housing & Shelter",
        "Hunger",

        // Rights & Legal
        "Human Rights",
        "Legal Aid & Justice",
        "Refugee & Migrant Support",
        "Caste & Minority Welfare",

        // Livelihood
        "Livelihood Support",
        "Microfinance & Self Employment",
        "Farmer Welfare & Agriculture",

        // Research & Tech
        "Medical Research",
        "Social Research & Policy",
        "Technology for Social Good",

        // Culture & Sports
        "Art & Culture Preservation",
        "Heritage Conservation",
        "Sports Development",

        // Community
        "Faith-Based Charity",
        "Community Service & Volunteering"
      ],
      required: true,
      index: true
    },
 

    // 🔁 Campaign type
    campaignType: {
      type: String,
      enum: ["MONETARY", "VOLUNTEER", "GOODS"],
      required: true,
      index: true
    },

    // 🚦 Lifecycle state
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "COMPLETED"],
      default: "ACTIVE",
      index: true
    },

    // ⏳ Duration
    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return this.startDate < value;
        },
        message: "End date must be after start date"
      }
    },

    // 🔍 ML-oriented scores
    urgencyScore: {
      type: Number,
      default: 0
    },

    trustScore: {
      type: Number,
      default: 0
    },

    // 📍 Address
    address: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      landmark: { type: String, trim: true, default: null }
    },

    // 📍 GeoJSON location
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: false
      }
    },

    // 💰 Monetary
    monetary: {
      targetAmount: { type: Number },
      collectedAmount: { type: Number, default: 0 },
      minDonation: { type: Number, default: 50 }
    },

    // 🙋 Volunteer
    volunteer: {
      requiredSkills: [{ type: String }],
      slotsAvailable: { type: Number },
      commitmentType: {
        type: String,
        enum: ["one-time", "weekly", "monthly"]
      }
    },

    // 📦 Goods
    goods: {
      goodsType: [{ type: String }],
      quantityRequired: { type: Number },
      pickupAvailable: { type: Boolean, default: false }
    },

       // 🖼️ Campaign Images (max 3)
    images: {
      type: [String], // array of file paths/URLs
      default: [],
      validate: {
        validator: function (val) {
          return val.length <= 3;
        },
        message: "Maximum 3 images allowed per campaign"
      }
    },
    // 📊 Popularity
    viewCount: { type: Number, default: 0 },
    donationCount: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);


// ✅ Virtual: Days Left (auto-calculated)
campaignSchema.virtual("daysLeft").get(function () {
  if (!this.endDate) return null;

  const today = new Date();
  const diffTime = this.endDate - today;

  return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
});


// ✅ Virtual: Is Active Now
campaignSchema.virtual("isActiveNow").get(function () {
  const now = new Date();

  return (
    this.startDate &&
    this.endDate &&
    now >= this.startDate &&
    now <= this.endDate &&
    this.status === "ACTIVE"
  );
});


// ✅ Enable virtuals in response
campaignSchema.set("toJSON", { virtuals: true });
campaignSchema.set("toObject", { virtuals: true });


// 🚀 Export
export default mongoose.model("Campaign", campaignSchema);