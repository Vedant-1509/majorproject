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
