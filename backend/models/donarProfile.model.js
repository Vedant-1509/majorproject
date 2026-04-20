import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Donor", 
    required: true 
  },

  bio: { type: String, default: "" },

  PAN: {
    type: String,
    match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    default: ""
  },

  address: {
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    landmark: { type: String, trim: true, default: null }
  },

  // 🌍 GEO LOCATION (for nearby campaigns)
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

  // 🧠 SKILLS (with level)
  skills: [
    {
      name: { type: String, required: true },
      level: { 
        type: String, 
        enum: ["beginner", "intermediate", "expert"], 
        default: "beginner" 
      }
    }
  ],

  // ❤️ INTERESTS (UNIFIED ENUM)
  interests: [
    {
      type: String,
      enum: [
        "Healthcare",
        "Mental Health Support",
        "Disability Support",
        "Nutrition & Hunger Relief",
        "Disaster Relief",
        "Emergency Medical Response",
        "Pandemic & Epidemic Support",

        "Education",
        "Scholarships & Higher Education",
        "Skill Development & Vocational Training",
        "Digital Literacy",

        "Child Welfare",
        "Orphan Care",
        "Women Empowerment",
        "Elderly Care",
        "Homelessness Support",

        "Animal Welfare",
        "Wildlife Conservation",
        "Stray Animal Support",
        "Environment & Cleanliness",
        "Climate Change Action",
        "Afforestation & Tree Plantation",
        "Water Conservation",
        "Renewable Energy & Sustainability",

        "Rural Development",
        "Urban Poverty Alleviation",
        "Slum Development",
        "Housing & Shelter",
        "Hunger",

        "Human Rights",
        "Legal Aid & Justice",
        "Refugee & Migrant Support",
        "Caste & Minority Welfare",

        "Livelihood Support",
        "Microfinance & Self Employment",
        "Farmer Welfare & Agriculture",

        "Medical Research",
        "Social Research & Policy",
        "Technology for Social Good",

        "Art & Culture Preservation",
        "Heritage Conservation",
        "Sports Development",

        "Faith-Based Charity",
        "Community Service & Volunteering"
      ]
    }
  ],

  // 💰 DONATION TYPES (NEW - IMPORTANT)
  donationTypes: [
    {
      type: String,
      enum: ["money", "food", "clothes", "blood", "time"]
    }
  ],

  availability: {
    type: String,
    enum: ["weekdays", "weekends", "anytime"],
    default: "anytime"
  },

  // 📊 ENGAGEMENT SCORE (for ranking)
  participationScore: {
    type: Number,
    default: 0,
    min: 0
  },

  // 🩸 BLOOD DONATION DATA
  bloodType: { 
    type: String, 
    enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], 
    default: null 
  },
  lastBloodDonationDate: { type: Date, default: null },

  // ⚙️ PREFERENCES
  preferences: {
    volunteerInvolvement: { type: Boolean, default: false },
    monetaryDonation: { type: Boolean, default: false },

    donationCategories: [
      {
        type: String,
        enum: [
          "Healthcare",
          "Mental Health Support",
          "Disability Support",
          "Nutrition & Hunger Relief",
          "Disaster Relief",
          "Emergency Medical Response",
          "Pandemic & Epidemic Support",

          "Education",
          "Scholarships & Higher Education",
          "Skill Development & Vocational Training",
          "Digital Literacy",

          "Child Welfare",
          "Orphan Care",
          "Women Empowerment",
          "Elderly Care",
          "Homelessness Support",

          "Animal Welfare",
          "Wildlife Conservation",
          "Stray Animal Support",
          "Environment & Cleanliness",
          "Climate Change Action",
          "Afforestation & Tree Plantation",
          "Water Conservation",
          "Renewable Energy & Sustainability",

          "Rural Development",
          "Urban Poverty Alleviation",
          "Slum Development",
          "Housing & Shelter",
          "Hunger",

          "Human Rights",
          "Legal Aid & Justice",
          "Refugee & Migrant Support",
          "Caste & Minority Welfare",

          "Livelihood Support",
          "Microfinance & Self Employment",
          "Farmer Welfare & Agriculture",

          "Medical Research",
          "Social Research & Policy",
          "Technology for Social Good",

          "Art & Culture Preservation",
          "Heritage Conservation",
          "Sports Development",

          "Faith-Based Charity",
          "Community Service & Volunteering"
        ]
      }
    ],

    preferredFrequency: { 
      type: String, 
      enum: ["one-time", "monthly", "yearly"], 
      default: "one-time" 
    }
  },

  // 🤖 EMBEDDING (for semantic search)
  embedding: {
    type: [Number],
    default: []
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 📍 GEO INDEX (IMPORTANT)
profileSchema.index({ location: "2dsphere" });

// ⏱️ AUTO UPDATE TIMESTAMP
profileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const donorProfile = mongoose.model("donorProfile", profileSchema);
export default donorProfile;
