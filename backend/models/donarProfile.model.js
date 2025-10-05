// import mongoose from "mongoose";

// const profileSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", required: true }, // reference to User model
//   bio: { type: String, default: "" },
//   address: {
//     street: String,
//     city: String,
//     state: String,
//     country: String,
//     zip: String,
//   },

//   phone: { type: String },

//   preferences: {
//     volunteerInvolvement: { type: Boolean, default: false },
//     monetaryDonation: { type: Boolean, default: false },
//     donationCategories: [String], 
//     preferredFrequency: { type: String, enum: ["one-time", "monthly", "yearly"], default: "one-time" }
//   },
//   iscompleted: { type: Boolean, default: false },

//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });


// const donorProfile = mongoose.model("donorProfile", profileSchema);
// export default donorProfile;
import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", required: true },

  bio: { type: String, default: "" },

  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zip: String,
    lat: Number,  // Auto-captured (GPS or Geocoding API)
    lng: Number
  },

  phone: { type: String }, // For Twilio SMS

  skills: [{ type: String }], // e.g. ["First Aid", "Teaching", "Cooking"]

  interests: {
    type: [String],
    enum: [
      "Blood Donation",
      "Food Donation",
      "Clothes Donation",
      "Educational Support",
      "Animal Welfare",
      "Healthcare & Medical Aid",
      "Disaster Relief",
      "Environment & Cleanliness",
      "Elderly Care",
      "Child Welfare",
      "Women Empowerment",
      "Community Service",
      "Fundraising & Campaigning",
      "Teaching & Mentorship",
      "Event Volunteering",
      "Technical Support / IT",
      "Legal / Documentation Help",
      "Sports & Fitness Support"
    ]
  },

  availability: {
    type: String,
    enum: ["weekdays", "weekends", "anytime"],
    default: "anytime"
  },

  participationScore: { type: Number, default: 0 },

  bloodType: { type: String, enum: ["A+","A-","B+","B-","O+","O-","AB+","AB-"], default: null },
  lastBloodDonationDate: { type: Date, default: null },

  preferences: {
    volunteerInvolvement: { type: Boolean, default: false },
    monetaryDonation: { type: Boolean, default: false },
    donationCategories: [String],
    preferredFrequency: { type: String, enum: ["one-time", "monthly", "yearly"], default: "one-time" }
  },

  isCompleted: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

profileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const donorProfile = mongoose.model("donorProfile", profileSchema);
export default donorProfile;
