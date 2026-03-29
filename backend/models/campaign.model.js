// import mongoose from "mongoose";

// const campaignSchema = new mongoose.Schema(
//   {
//     // 🔗 NGO who owns the campaign
//     ngoId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "NGO",
//       required: true,
//       index: true
//     },

//     // 🏷️ Basic info
//     title: {
//       type: String,
//       required: true,
//       trim: true
//     },

//     description: {
//       type: String,
//       required: true
//     },

//     // 📂 Category used by recommendation engine
//     category: {
//       type: String,
//       enum: [
//         // 🏥 Health & Well-being
//         "Healthcare",
//         "Mental Health Support",
//         "Disability Support",
//         "Nutrition & Hunger Relief",

//         // 🚨 Emergency & Crisis
//         "Disaster Relief",
//         "Emergency Medical Response",
//         "Pandemic & Epidemic Support",

//         // 🎓 Education & Skill
//         "Education",
//         "Scholarships & Higher Education",
//         "Skill Development & Vocational Training",
//         "Digital Literacy",

//         // 👶 Social Welfare
//         "Child Welfare",
//         "Orphan Care",
//         "Women Empowerment",
//         "Elderly Care",
//         "Homelessness Support",

//         // 🐾 Animal & Wildlife
//         "Animal Welfare",
//         "Wildlife Conservation",
//         "Stray Animal Support",

//         // 🌱 Environment & Sustainability
//         "Environment & Cleanliness",
//         "Climate Change Action",
//         "Afforestation & Tree Plantation",
//         "Water Conservation",
//         "Renewable Energy & Sustainability",

//         // 🏘️ Community & Development
//         "Rural Development",
//         "Urban Poverty Alleviation",
//         "Slum Development",
//         "Housing & Shelter",
//         "Hunger",

//         // ⚖️ Rights & Inclusion
//         "Human Rights",
//         "Legal Aid & Justice",
//         "Refugee & Migrant Support",
//         "Caste & Minority Welfare",

//         // 🧑‍🤝‍🧑 Employment & Economy
//         "Livelihood Support",
//         "Microfinance & Self Employment",
//         "Farmer Welfare & Agriculture",

//         // 🧠 Research & Innovation
//         "Medical Research",
//         "Social Research & Policy",
//         "Technology for Social Good",

//         // 🎭 Culture & Heritage
//         "Art & Culture Preservation",
//         "Heritage Conservation",
//         "Sports Development",

//         // 🛐 Faith & Spiritual
//         "Faith-Based Charity",
//         "Community Service & Volunteering"
//       ],
//       required: true,
//       index: true
//     },

//     // 🔁 Campaign type
//     campaignType: {
//       type: String,
//       enum: ["MONETARY", "VOLUNTEER", "GOODS"],
//       required: true,
//       index: true
//     },

//     // 🚦 Lifecycle state
//     status: {
//       type: String,
//       enum: ["ACTIVE", "PAUSED", "COMPLETED"],
//       default: "ACTIVE",
//       index: true
//     },

//     // ⏳ Duration
//     startDate: { type: Date },
//     endDate: { type: Date },

//     // 🔍 ML-oriented scores (derived later)
//     urgencyScore: {
//       type: Number,
//       default: 0
//     },

//     trustScore: {
//       type: Number,
//       default: 0
//     },
//     // 📍 Address (human readable)
//     address: {
//       city: { type: String, trim: true },
//       state: { type: String, trim: true },
//       country: { type: String, trim: true },
//       landmark: { type: String, trim: true, default: null }
//     },

//     // 📍 GeoJSON location
//     location: {
//       type: {
//         type: String,
//         enum: ["Point"],
//         default: "Point"
//       },
//       coordinates: {
//         type: [Number], // [lng, lat]
//         required: false
//       }
//     },

//     // 💰 Monetary Donation Fields
//     monetary: {
//       targetAmount: { type: Number },
//       collectedAmount: { type: Number, default: 0 },
//       minDonation: { type: Number, default: 50 }
//     },

//     // 🙋 Volunteer Campaign Fields
//     volunteer: {
//       requiredSkills: [{ type: String }],
//       slotsAvailable: { type: Number },
//       commitmentType: {
//         type: String,
//         enum: ["one-time", "weekly", "monthly"]
//       }
//     },

//     // 📦 Goods Donation Fields
//     goods: {
//       goodsType: [{ type: String }],
//       quantityRequired: { type: Number },
//       pickupAvailable: { type: Boolean, default: false }
//     },

//     // 📊 Popularity signals (derived)
//     viewCount: { type: Number, default: 0 },
//     donationCount: { type: Number, default: 0 }
//   },

//   {
//     timestamps: true
//   }
// );

// export default mongoose.model("Campaign", campaignSchema);

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