// services/queryEmbeddingService.js
// import axios from "axios";
// import 'dotenv/config';
// import CampaignEmbedding from "../models/CampaignEmbedding.js";
// import donorProfile from "../models/donarProfile.model.js";
// import Campaign from "../models/campaign.model.js";
// import { buildQueryTextForUser } from "./buildQueryFromUserProfile.js";
// import {computeLRBSScore} from "./lbrs.js";

// export const getCandidateCampaigns = async (userId) => {
//   // 1️⃣ Fetch user profile
//   const userProfile = await donorProfile.findOne({ userId }).lean();
//   console.log("User Profile fetched:", userProfile);
//   if (!userProfile) return [];

//   // 2️⃣ Build query
//   const queryText = await buildQueryTextForUser(userId, userProfile);
//   if (!queryText) return [];

//   // 3️⃣ Semantic candidates
//   const semanticResults = await findSimilarCampaigns(queryText, {
//     topK: 50
//   });

//   if (!semanticResults.length) return [];
//   console.log(`Found ${semanticResults.length} semantic candidates for user ${userId}`);

//   // 4️⃣ Fetch campaigns
//   const campaignIds = semanticResults.map(r => r.campaignId);

//   const campaigns = await Campaign.find({
//     _id: { $in: campaignIds },
//     status: "ACTIVE"
//   }).lean();

//   // 5️⃣ Map semantic scores
//   const semanticMap = new Map();
//   semanticResults.forEach(r => {
//     semanticMap.set(r.campaignId.toString(), r.semanticScore);
//   });

//   // 6️⃣ 🔥 APPLY LRBS + HYBRID SCORING
//   const scoredCampaigns = campaigns.map(campaign => {
//     const semanticScore =
//       semanticMap.get(campaign._id.toString()) || 0;

//     const lrbs = computeLRBSScore(userProfile, campaign);
//     console.log(`LRBS for campaign ${campaign._id}:`, lrbs);
//     console.log(`Semantic score for campaign ${campaign._id}:`, semanticScore);
//     const finalScore =
//       semanticScore + lrbs.finalScore;

//     return {
//       campaign,
//       semanticScore,
//       categoryScore: lrbs.categoryScore,
//       locationScore: lrbs.locationScore,
//       distance: lrbs.distance,
//       finalScore
//     };
//   });

//   // 7️⃣ Sort
//   scoredCampaigns.sort((a, b) => b.finalScore - a.finalScore);

//   // 8️⃣ Return top campaigns
//   return scoredCampaigns.slice(0, 20);
// };


// export const generateQueryEmbedding = async (queryText) => {
//   const response = await axios.post(
//     "https://api.cohere.ai/v1/embed",
//     {
//       model: "embed-english-v3.0",
//       texts: [queryText],
//       input_type: "search_query"
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
//         "Content-Type": "application/json"
//       }
//     }
//   );

//   return response.data.embeddings[0];
// };


// // utils/cosineSimilarity.js
// export const cosineSimilarity = (a, b) => {
//   let dot = 0;
//   let normA = 0;
//   let normB = 0;

//   for (let i = 0; i < a.length; i++) {
//     dot += a[i] * b[i];
//     normA += a[i] * a[i];
//     normB += b[i] * b[i];
//   }

//   return dot / (Math.sqrt(normA) * Math.sqrt(normB));
// };



// export const findSimilarCampaigns = async (
//   queryText,
//   {
//     topK = 10,
//     minSimilarity = 0.0
//   } = {}
// ) => {
//   // 1️⃣ Generate embedding for the query
//   const queryVector = await generateQueryEmbedding(queryText);

//   // 2️⃣ Fetch all campaign embeddings
//   const campaignEmbeddings = await CampaignEmbedding.find().lean();

//   // 3️⃣ Compute similarity scores
//   const scoredCampaigns = campaignEmbeddings.map(doc => {
//     const score = cosineSimilarity(queryVector, doc.embedding);

//     return {
//       campaignId: doc.campaignId,
//       similarityScore: score
//     };
//   });

//   // 4️⃣ Sort & filter
//   return scoredCampaigns
//     .filter(c => c.similarityScore >= minSimilarity)
//     .sort((a, b) => b.similarityScore - a.similarityScore)
//     .slice(0, topK);
// };

// export const getCandidateCampaigns = async (userId) => {
//   const userProfile = await donorProfile.findOne({ userId }).lean();
//   console.log("User Profile fetched:", userProfile);
//   const queryText = await buildQueryTextForUser(userId, userProfile);
//   if (!queryText) return [];

//   return findSimilarCampaigns(queryText, { topK: 10 });
// };


import axios from "axios";
import "dotenv/config";
import CampaignEmbedding from "../models/CampaignEmbedding.js";
import donorProfile from "../models/donarProfile.model.js";
import Campaign from "../models/campaign.model.js";
import { buildQueryTextForUser } from "./buildQueryFromUserProfile.js";
import { computeLRBSScore } from "./lbrs.js";


// 🚀 MAIN FUNCTION
export const getCandidateCampaigns = async (userId) => {
  try {
    const userProfile = await donorProfile.findOne({ userId }).lean();
    console.log("User Profile fetched:", userProfile);

    if (!userProfile) return [];

    // 🔹 Build query text
    const queryText = await buildQueryTextForUser(userId, userProfile);
    if (!queryText) return [];

    console.log("Query Text:", queryText);

    // 🔹 Semantic search
    const semanticResults = await findSimilarCampaigns(queryText, {
      topK: 50
    });

    if (!semanticResults.length) return [];

    console.log(
      `Found ${semanticResults.length} semantic candidates for user ${userId}`
    );

    // 🔹 Fetch campaigns
    const campaignIds = semanticResults.map(r => r.campaignId);

    const campaigns = await Campaign.find({
      _id: { $in: campaignIds },
      status: "ACTIVE"
    }).lean();

    // 🔹 Map semantic scores
    const semanticMap = new Map();
    semanticResults.forEach(r => {
      // ✅ FIXED HERE
      semanticMap.set(r.campaignId.toString(), r.similarityScore);
    });

    // 🔹 Final scoring
    const scoredCampaigns = campaigns.map(campaign => {
      const semanticScore =
        semanticMap.get(campaign._id.toString()) || 0;

      const lrbs = computeLRBSScore(userProfile, campaign);

      console.log(`Campaign ${campaign._id}`);
      console.log("Semantic:", semanticScore);
      console.log("LRBS:", lrbs);

      const finalScore =
        semanticScore + lrbs.finalScore;

      return {
        campaign,
        semanticScore,
        categoryScore: lrbs.categoryScore,
        locationScore: lrbs.locationScore,
        distance: lrbs.distance,
        finalScore
      };
    });

    // 🔹 Sort
    scoredCampaigns.sort((a, b) => b.finalScore - a.finalScore);

    return scoredCampaigns.slice(0, 20);

  } catch (error) {
    console.error("Error in getCandidateCampaigns:", error);
    return [];
  }
};



// 🚀 EMBEDDING GENERATION
export const generateQueryEmbedding = async (queryText) => {
  const response = await axios.post(
    "https://api.cohere.ai/v1/embed",
    {
      model: "embed-english-v3.0",
      texts: [queryText],
      input_type: "search_query"
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.embeddings[0];
};



// 🚀 SAFE COSINE SIMILARITY
export const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};



// 🚀 SEMANTIC SEARCH
export const findSimilarCampaigns = async (
  queryText,
  {
    topK = 10,
    minSimilarity = 0.0
  } = {}
) => {
  try {
    // 🔹 Get query embedding
    const queryVector = await generateQueryEmbedding(queryText);

    if (!queryVector || queryVector.length === 0) {
      console.error("Query embedding failed");
      return [];
    }

    // 🔹 Fetch campaign embeddings
    const campaignEmbeddings = await CampaignEmbedding.find().lean();

    if (!campaignEmbeddings.length) {
      console.warn("No campaign embeddings found");
      return [];
    }

    // 🔹 Compute similarity
    const scoredCampaigns = campaignEmbeddings.map(doc => {
      const score = cosineSimilarity(queryVector, doc.embedding);

      return {
        campaignId: doc.campaignId,
        similarityScore: score
      };
    });

    console.log(
      "Top similarity sample:",
      scoredCampaigns.slice(0, 3)
    );

    // 🔹 Sort + filter
    return scoredCampaigns
      .filter(c => c.similarityScore >= minSimilarity)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, topK);

  } catch (error) {
    console.error("Error in findSimilarCampaigns:", error);
    return [];
  }
};
