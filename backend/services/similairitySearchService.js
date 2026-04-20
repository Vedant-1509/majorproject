import mongoose from "mongoose";
import axios from "axios";
import "dotenv/config";
import CampaignEmbedding from "../models/CampaignEmbedding.js";
import donorProfile from "../models/donarProfile.model.js";
import Campaign from "../models/campaign.model.js";
import { buildQueryTextForUser } from "./buildQueryFromUserProfile.js";
import { computeLRBSScore } from "./lbrs.js";
import { logInteraction } from "../services/InteractionLogger.js";

import { buildFeatures, rankCampaigns } from "./LtrRanker.js";

// export const getCandidateCampaigns = async (userId) => {
//   try {
//     console.log("Incoming userId:", userId, typeof userId);

//     const userProfile = await donorProfile.findOne({ userId }).lean();
//     console.log("User Profile fetched:", userProfile);

//     if (!userProfile) return [];

//     // 🔹 Build query text
//     const queryText = await buildQueryTextForUser(userId, userProfile);
//     if (!queryText) return [];

//     console.log("Query Text:", queryText);

//     // 🔹 Semantic search
//     const semanticResults = await findSimilarCampaigns(queryText, {
//       topK: 50
//     });

//     if (!semanticResults.length) return [];

//     console.log(
//       `Found ${semanticResults.length} semantic candidates for user ${userId}`
//     );

//     // 🔹 Fetch campaigns
//     const campaignIds = semanticResults.map(r => r.campaignId);

//     const campaigns = await Campaign.find({
//       _id: { $in: campaignIds },
//       status: "ACTIVE"
//     }).lean();

//     // 🔹 Map semantic scores
//     const semanticMap = new Map();
//     semanticResults.forEach(r => {
//       semanticMap.set(r.campaignId.toString(), r.similarityScore);
//     });

//     // 🔹 Scoring
//     const scoredCampaigns = campaigns.map(campaign => {
//       const semanticScore =
//         semanticMap.get(campaign._id.toString()) || 0;

//       const lrbs = computeLRBSScore(userProfile, campaign);

//       const finalScore = computeFinalScore({
//         semanticScore,
//         categoryScore: lrbs.categoryScore,
//         locationScore: lrbs.locationScore,
//         urgencyScore: lrbs.urgencyScore
//       });

//       // 🔥 Feature snapshot (IMPORTANT FOR LTR),
//       const features = {
//         campaignType: campaign.campaignType,
//         semanticScore,
//         categoryScore: lrbs.categoryScore,
//         locationScore: lrbs.locationScore,
//         distance: lrbs.distance,
//         urgencyScore: lrbs.urgencyScore
//       };

//       return {
//         campaign,
//         features,
//         finalScore
//       };
//     });

//     // 🔹 Sort
//     scoredCampaigns.sort((a, b) => b.finalScore - a.finalScore);

//     const topCampaigns = scoredCampaigns.slice(0, 20);

//     // 🚀 🔥 LOG IMPRESSIONS (CRITICAL FOR LTR)
//     topCampaigns.forEach((item, index) => {
//       logInteraction({
//         userId,
//         campaign: item.campaign,
//         features: item.features,
//         action: "impression",
//         rankPosition: index + 1
//       });
//     });

//     return topCampaigns;

//   } catch (error) {
//     console.error("Error in getCandidateCampaigns:", error);
//     return [];
//   }
// };



// 🚀 EMBEDDING GENERATION

// export const getCandidateCampaigns = async (userId) => {
//   try {
//     console.log("Incoming userId:", userId, typeof userId);
 
//     // ── 1. User profile ───────────────────────────────────────────────────
//     const userProfile = await donorProfile.findOne({ userId }).lean();
//     console.log("User Profile fetched:", userProfile);
//     if (!userProfile) return [];
//  console.log("User Profile:", userProfile);
//     // ── 2. Query text for semantic search ─────────────────────────────────
//     const queryText = await buildQueryTextForUser(userId, userProfile);
//     if (!queryText) return [];
//     console.log("Query Text:", queryText);
 
//     // ── 3. Semantic retrieval (candidate generation) ───────────────────────
//     const semanticResults = await findSimilarCampaigns(queryText, { topK: 50 });
//     if (!semanticResults.length) return [];
//     console.log(`Found ${semanticResults.length} semantic candidates for user ${userId}`);
 
//     // ── 4. Fetch full campaign docs ────────────────────────────────────────
//     const campaignIds = semanticResults.map(r => r.campaignId);
//     const campaigns   = await Campaign.find({
//       _id:    { $in: campaignIds },
//       status: "ACTIVE",
//     }).lean();
//  console.log(`Fetched ${campaigns.length} campaign docs for semantic candidates`);
//     // ── 5. Build semantic score lookup ────────────────────────────────────
//     const semanticMap = new Map();
//     semanticResults.forEach(r => {
//       semanticMap.set(r.campaignId.toString(), r.similarityScore);
//     });
//   console.log("Semantic score map built with entries:", semanticMap.size);
//     // ── 6. Build feature objects ──────────────────────────────────────────
//     //    buildFeatures() is the single source of truth — same function used
//     //    by the training pipeline's feature extraction.  Do NOT inline this.
//     const scoredCampaigns = campaigns.map(campaign => {
//       const semanticScore = semanticMap.get(campaign._id.toString()) ?? 0;
//       const lrbs          = computeLRBSScore(userProfile, campaign);
//       const features      = buildFeatures(campaign, semanticScore, lrbs);  // ← replaces manual object
//  console.log(`Features for campaign ${campaign._id}:`, features);
//       return { campaign, features };
//       // NOTE: finalScore from computeFinalScore() is intentionally removed.
//       //       The XGBoost model provides the ranking score in step 7.
//     });
 
//     // ── 7. XGBoost LTR ranking ────────────────────────────────────────────
//     //    rankCampaigns() runs model inference and returns items sorted by
//     //    ltrScore descending.  Falls back to semanticScore order on error.
//     const rankedCampaigns = await rankCampaigns(scoredCampaigns);
//  console.log("Top ranked campaigns after LTR:", rankedCampaigns.slice(0, 5).map(c => ({
//       id: c.campaign._id,
//       ltrScore: c.ltrScore,
//       semanticScore: c.features.semanticScore
//     })));
//     // ── 8. Take top 20 ────────────────────────────────────────────────────
//     const topCampaigns = rankedCampaigns.slice(0, 20);
 
//     // ── 9. Log impressions (critical for future LTR retraining) ──────────
//     topCampaigns.forEach((item, index) => {
//       logInteraction({
//         userId,
//         campaign:     item.campaign,
//         features:     item.features,   // full feature bag including ltrScore
//         action:       "impression",
//         rankPosition: index + 1,
//         ltrScore:     item.ltrScore,   // logged for offline analysis
//       });
//     });
 
//     return topCampaigns;
 
//   } catch (error) {
//     console.error("Error in getCandidateCampaigns:", error);
//     return [];
//   }
// };

export const getCandidateCampaigns = async (userId) => {
  try {
    console.log("Incoming userId:", userId, typeof userId);

    // ── 1. User profile ───────────────────────────────────────────────────
    const userProfile = await donorProfile.findOne({ userId }).lean();
    console.log("User Profile fetched:", userProfile);
    if (!userProfile) return [];
    console.log("User Profile:", userProfile);

    // ── 2. Query text for semantic search ─────────────────────────────────
    const queryText = await buildQueryTextForUser(userId, userProfile);
    if (!queryText) return [];
    console.log("Query Text:", queryText);

    // ── 3. Semantic retrieval (candidate generation) ───────────────────────
    const semanticResults = await findSimilarCampaigns(queryText, { topK: 50 });
    if (!semanticResults.length) return [];
    console.log(`Found ${semanticResults.length} semantic candidates for user ${userId}`);

    // ── 4. Fetch full campaign docs ────────────────────────────────────────
    // Cast to ObjectId to avoid type mismatch between vector store string IDs
    // and MongoDB ObjectId — $in does strict type comparison, strings won't match
    const campaignIds = semanticResults.map(r =>
      new mongoose.Types.ObjectId(r.campaignId.toString())
    );

    console.log(
      "campaignIds (sample):",
      campaignIds.slice(0, 3).map(id => id.toString())
    );

    const campaigns = await Campaign.find({
      _id:    { $in: campaignIds },
      status: "ACTIVE",
    }).lean();

    console.log(`Fetched ${campaigns.length} campaign docs for semantic candidates`);

    // If still 0, check whether status filter is the culprit
    if (campaigns.length === 0) {
      const withoutStatusFilter = await Campaign.find({
        _id: { $in: campaignIds },
      }).lean();
      console.warn(
        `[DEBUG] Without status filter: ${withoutStatusFilter.length} docs found.`,
        "Statuses present:",
        [...new Set(withoutStatusFilter.map(c => c.status))]
      );
      return [];
    }

    // ── 5. Build semantic score lookup ────────────────────────────────────
    const semanticMap = new Map();
    semanticResults.forEach(r => {
      semanticMap.set(r.campaignId.toString(), r.similarityScore);
    });
    console.log("Semantic score map built with entries:", semanticMap.size);

    // ── 6. Build feature objects ──────────────────────────────────────────
    //    buildFeatures() is the single source of truth — same function used
    //    by the training pipeline's feature extraction. Do NOT inline this.
    const scoredCampaigns = campaigns.map(campaign => {
      const semanticScore = semanticMap.get(campaign._id.toString()) ?? 0;
      const lrbs          = computeLRBSScore(userProfile, campaign);
      const features      = buildFeatures(campaign, semanticScore, lrbs);
      console.log(`Features for campaign ${campaign._id}:`, features);
      return { campaign, features };
      // NOTE: finalScore from computeFinalScore() is intentionally removed.
      //       The XGBoost model provides the ranking score in step 7.
    });

    // ── 7. XGBoost LTR ranking ────────────────────────────────────────────
    //    rankCampaigns() runs model inference and returns items sorted by
    //    ltrScore descending. Falls back to semanticScore order on error.
    const rankedCampaigns = await rankCampaigns(scoredCampaigns);
    console.log(
      "Top ranked campaigns after LTR:",
      rankedCampaigns.slice(0, 5).map(c => ({
        id:            c.campaign._id,
        ltrScore:      c.ltrScore,
        semanticScore: c.features.semanticScore,
      }))
    );

    // ── 8. Take top 20 ────────────────────────────────────────────────────
    const topCampaigns = rankedCampaigns.slice(0, 20);

    // ── 9. Log impressions (critical for future LTR retraining) ──────────
    topCampaigns.forEach((item, index) => {
      logInteraction({
        userId,
        campaign:     item.campaign,
        features:     item.features,  // full feature bag including ltrScore
        action:       "impression",
        rankPosition: index + 1,
        ltrScore:     item.ltrScore,  // logged for offline analysis
      });
    });

    return topCampaigns;

  } catch (error) {
    console.error("Error in getCandidateCampaigns:", error);
    return [];
  }
};




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
export const computeFinalScore = ({
  semanticScore,
  categoryScore,
  locationScore,
  urgencyScore
}) => {
  // 🚨 HARD FILTER
  if (semanticScore < 0.4) return 0;

  // 🔥 Boost signals
  const semantic = Math.pow(semanticScore, 1.3);
  const urgency = Math.pow(urgencyScore, 0.5);

  // 🎯 Final formula (KEY CHANGE)
  return (
    semantic *
    (1 + urgency) *
    (0.6 + 0.4 * locationScore) *
    (0.7 + 0.3 * categoryScore)
  );
};