import { normalizeCategoryScores } from "./categoryScores.js";

/**
 * 🔥 LRBS (Location + Relevance Based Scoring)
 * Single file implementation
 */

/* ================================
   📍 Distance Calculation (Haversine)
================================ */

// const getDistanceInKm = (coord1, coord2) => {
//   if (!coord1 || !coord2) return null;

//   const [lon1, lat1] = coord1;
//   const [lon2, lat2] = coord2;

//   const R = 6371; // Earth radius in km

//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;
//   console.log(`Calculating distance between (${lat1}, ${lon1}) and (${lat2}, ${lon2})`);

//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos((lat1 * Math.PI) / 180) *
//       Math.cos((lat2 * Math.PI) / 180) *
//       Math.sin(dLon / 2) ** 2;

//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//   return R * c;
// };


// /* ================================
//    📍 Distance → Location Score
// ================================ */

// const getLocationScore = (distance) => {
//   if (distance == null) return 0;

//   if (distance <= 5) return 1;       // very close
//   if (distance <= 20) return 0.7;    // nearby
//   if (distance <= 50) return 0.4;    // moderate
//   return 0;                          // far
// };


// /* ================================
//    🧠 LRBS Core Function
// ================================ */

// export const computeLRBSScore = (userProfile, campaign) => {
//   let categoryScore = 0;
//   let locationScore = 0;
//   let distance = null;

//   // 🎯 1. Category Score (User Preference)
//   if (userProfile?.categoryScores && campaign?.category) {
//     categoryScore =
//       userProfile.categoryScores[campaign.category] || 0;
//   }

//   // 📍 2. Location Score (Geo-based)
//   const userCoords = userProfile?.location?.coordinates;
//   const campaignCoords = campaign?.location?.coordinates;

//   if (
//     Array.isArray(userCoords) &&
//     Array.isArray(campaignCoords) &&
//     userCoords.length === 2 &&
//     campaignCoords.length === 2
//   ) {
//     console.log(`Computing distance between user at ${userCoords} and campaign at ${campaignCoords}`);
//     distance = getDistanceInKm(userCoords, campaignCoords);
//     locationScore = getLocationScore(distance);
//   }

//   // 🧮 3. Final Score
//   const finalScore = categoryScore + locationScore;

//   return {
//     finalScore,
//     categoryScore,
//     locationScore,
//     distance
//   };
// }

const getDistanceInKm = (coord1, coord2) => {
  if (!coord1 || !coord2) return null;

  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};


// 🔥 IMPROVED (smooth decay instead of hard buckets)
const getLocationScore = (distance) => {
  if (distance == null) return 0;

  // exponential decay
  return Math.exp(-distance / 60); 
};


/* ================================
   🧠 LRBS Core Function
================================ */

export const computeLRBSScore = (userProfile, campaign, interestProfile = null) => {
  let categoryScore = 0;
  let locationScore = 0;
  let urgencyScore = 0;
  let distance = null;

  // 🎯 1. Category Score
  const categoryScores = normalizeCategoryScores(
    interestProfile?.categoryScores ?? userProfile?.categoryScores
  );

  const interestScore =
    campaign?.category && Object.keys(categoryScores).length > 0
      ? Number(categoryScores[campaign.category] || 0)
      : 0;

  const preferenceScore =
    campaign?.category &&
    Array.isArray(userProfile?.preferences?.donationCategories) &&
    userProfile.preferences.donationCategories.includes(campaign.category)
      ? 1
      : 0;

  categoryScore = Math.max(interestScore, preferenceScore);

  // 📍 2. Location Score
  const userCoords = userProfile?.location?.coordinates;
  const campaignCoords = campaign?.location?.coordinates;

  if (
    Array.isArray(userCoords) &&
    Array.isArray(campaignCoords) &&
    userCoords.length === 2 &&
    campaignCoords.length === 2
  ) {
    distance = getDistanceInKm(userCoords, campaignCoords);
    locationScore = getLocationScore(distance);
  }

  // ⏳ 3. Urgency Score (NEW 🔥)
  if (campaign?.endDate) {
    const today = new Date();
    const end = new Date(campaign.endDate);

    const diffTime = end - today;

    const daysLeft = Math.max(
      Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
      0
    );

    urgencyScore = 1 / (1 + daysLeft);
  }

  // 🧮 4. Weighted Final Score (IMPORTANT 🔥)
  const finalScore =
    0.5 * categoryScore +
    0.3 * locationScore +
    0.2 * urgencyScore;

  return {
    finalScore,
    categoryScore,
    locationScore,
    urgencyScore,
    distance
  };
};
