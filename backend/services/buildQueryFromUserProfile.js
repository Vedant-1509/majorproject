import UserInterestProfile from "../models/UserInterestProfile.js";


export const buildQueryTextForUser = async (userId, userProfile) => {
  const interestProfile = await UserInterestProfile.findOne({ userId });
  console.log("User Interest Profile fetched:", interestProfile);
  // 🟢 Warm user
  if (
    interestProfile &&
    Object.keys(interestProfile.categoryScores || {}).length > 0
  ) {
    return buildQueryFromUserInterestProfile(interestProfile);
  }

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

// export const buildQueryFromUserProfile = (userProfile) => {
//   if (!userProfile) {
//     return "Recommend impactful and trusted NGO campaigns.";
//   }

//   const interests = userProfile.interests || [];
//   const categories = userProfile.preferences?.donationCategories || [];
//   const donationTypes = userProfile.donationTypes || [];
//   const location = userProfile.address?.city || "unknown location";

//   let query = `User is located in ${location}. `;

//   // ✅ PRIORITY 1: Interests
//   if (interests.length > 0) {
//     query += `User is strongly interested in ${interests.join(", ")}. `;
//   }

//   // ✅ PRIORITY 2: Preferences fallback / enrichment
//   if (categories.length > 0) {
//     query += `Also prefers donation categories like ${categories.join(", ")}. `;
//   }

//   // ✅ Donation type signal (important for filtering campaigns)
//   if (donationTypes.length > 0) {
//     query += `Prefers donation methods: ${donationTypes.join(", ")}. `;
//   }

//   query += "Recommend the most relevant and high-impact NGO campaigns.";

//   return query.trim();
// };

export const buildQueryFromUserProfile = (userProfile) => {
  if (!userProfile) {
    return "Recommend relevant NGO campaigns.";
  }

  const interests = userProfile.interests || [];
  const categories = userProfile.preferences?.donationCategories || [];
  const donationTypes = userProfile.donationTypes || [];
  const location = userProfile.address?.city || "";

  const focus = interests.length
    ? interests
    : categories;

  let query = "";

  if (location) {
    query += `${location}. `;
  }

  if (focus.length) {
    query += `${focus.join(", ")}. `;
  }

  if (donationTypes.length) {
    query += `${donationTypes.join(", ")} donation. `;
  }

  query += "NGO campaigns.";

  return query.trim();
};
export const buildQueryFromUserInterestProfile = (
  userInterestProfile,
  {
    minScoreThreshold = 0.0,
    maxCategories = 1
  } = {}
) => {
  if (!userInterestProfile?.categoryScores) return null;

  const categoryScores =
    userInterestProfile.categoryScores instanceof Map
      ? Object.fromEntries(userInterestProfile.categoryScores)
      : userInterestProfile.categoryScores;

  const topCategories = Object.entries(categoryScores)
    .filter(([_, score]) => score >= minScoreThreshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCategories)
    .map(([category]) => category);

  console.log("Top categories for user:", topCategories);

  if (topCategories.length === 0) return null;

  return `
    User is interested in supporting causes related to
    ${topCategories.join(", ")}.
    Recommend relevant NGO campaigns aligned with these interests.
  `.trim();
};
