import UserInterestProfile from "../models/UserInterestProfile.js";
import { getTopCategories } from "./categoryScores.js";


export const buildQueryTextForUser = async (
  userId,
  userProfile,
  interestProfile = null
) => {
  const resolvedInterestProfile =
    interestProfile ?? await UserInterestProfile.findOne({ userId }).lean();

  console.log("User Interest Profile fetched:", resolvedInterestProfile);

  // 🟢 Warm user
  const warmQuery = buildQueryFromUserInterestProfile(resolvedInterestProfile);
  if (warmQuery) return warmQuery;

  // 🧊 Cold-start user
  return buildQueryFromUserProfile(userProfile);
};


// export const buildQueryFromUserProfile = (userProfile) => {
//   if (!userProfile || !userProfile.preferences?.length) {
//     return "Recommend impactful and trusted NGO campaigns for donation.";
//   }

//   return `
//     User is interested in supporting causes related to
//     ${userProfile.preferences.join(", ")}.
//     Recommend relevant NGO campaigns.
//   `.trim();
// };

export const buildQueryFromUserProfile = (userProfile) => {
  if (!userProfile) {
    return "Recommend impactful and trusted NGO campaigns for donation.";
  }

  const {
    bio,
    address,
    skills = [],
    interests = [],
    availability,
    preferences = {},
    bloodType,
    lastBloodDonationDate,
    participationScore
  } = userProfile;

  const {
    volunteerInvolvement,
    monetaryDonation,
    donationCategories = [],
    preferredFrequency
  } = preferences;

    return `
${donationCategories.join(" ")} 
${interests.join(" ")} 
${skills.join(" ")} 
${address?.city || ""} India 
${availability || ""} 
${volunteerInvolvement ? "volunteer" : ""} 
${monetaryDonation ? "donation" : ""} 
${bloodType ? `blood ${bloodType}` : ""}
`.replace(/\s+/g, " ").trim();
};


// export const buildQueryFromUserInterestProfile = (
//   userInterestProfile,
//   {
//     minScoreThreshold = 0.3,
//     maxCategories = 1
//   } = {}
// ) => {
//   if (
//     !userInterestProfile ||
//     !userInterestProfile.categoryScores ||
//     Object.keys(userInterestProfile.categoryScores).length === 0
//   ) {
//     return null; // caller handles cold-start
//   }

//   // 1️⃣ Sort categories by interest strength
//   const topCategories = Object.entries(
//     userInterestProfile.categoryScores
//   )
//     .filter(([_, score]) => score >= minScoreThreshold)
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, maxCategories)
//     .map(([category]) => category);


//   console.log("Top categories for user:", topCategories);
//   if (topCategories.length === 0) {
//     return null; // still cold-start
//   }

//   // 2️⃣ Build clean semantic query text
//   return `
//     User is interested in supporting causes related to
//     ${topCategories.join(", ")}.
//     Recommend relevant NGO campaigns aligned with these interests.
//   `.trim();
// };


export const buildQueryFromUserInterestProfile = (
  userInterestProfile,
  {
    minScoreThreshold = 0.1,
    maxCategories = 1
  } = {}
) => {
  if (!userInterestProfile?.categoryScores) return null;

  const topCategories = getTopCategories(userInterestProfile.categoryScores, {
    minScoreThreshold,
    maxCategories
  });

  console.log("Top categories for user:", topCategories);

  if (topCategories.length === 0) return null;

  return `
    User is interested in supporting causes related to
    ${topCategories.join(", ")}.
    Recommend relevant NGO campaigns aligned with these interests.
  `.trim();
};
