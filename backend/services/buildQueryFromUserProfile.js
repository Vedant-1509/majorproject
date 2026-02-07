import UserInterestProfile from "../models/UserInterestProfile.js";


export const buildQueryTextForUser = async (userId, userProfile) => {
  const interestProfile = await UserInterestProfile.findOne({ userId });

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
  if (!userProfile || !userProfile.preferences?.length) {
    return "Recommend impactful and trusted NGO campaigns for donation.";
  }

  return `
    User is interested in supporting causes related to
    ${userProfile.preferences.join(", ")}.
    Recommend relevant NGO campaigns.
  `.trim();
};


export const buildQueryFromUserInterestProfile = (
  userInterestProfile,
  {
    minScoreThreshold = 0.3,
    maxCategories = 3
  } = {}
) => {
  if (
    !userInterestProfile ||
    !userInterestProfile.categoryScores ||
    Object.keys(userInterestProfile.categoryScores).length === 0
  ) {
    return null; // caller handles cold-start
  }

  // 1️⃣ Sort categories by interest strength
  const topCategories = Object.entries(
    userInterestProfile.categoryScores
  )
    .filter(([_, score]) => score >= minScoreThreshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCategories)
    .map(([category]) => category);

  if (topCategories.length === 0) {
    return null; // still cold-start
  }

  // 2️⃣ Build clean semantic query text
  return `
    User is interested in supporting causes related to
    ${topCategories.join(", ")}.
    Recommend relevant NGO campaigns aligned with these interests.
  `.trim();
};
