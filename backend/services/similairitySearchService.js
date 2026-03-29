import axios from "axios";
import "dotenv/config";
import CampaignEmbedding from "../models/CampaignEmbedding.js";
import donorProfile from "../models/donarProfile.model.js";
import UserInterestProfile from "../models/UserInterestProfile.js";
import Campaign from "../models/campaign.model.js";
import { buildQueryTextForUser } from "./buildQueryFromUserProfile.js";
import { computeLRBSScore } from "./lbrs.js";


// 🚀 MAIN FUNCTION
export const getCandidateCampaigns = async (userId) => {
  try {
    const [userProfile, interestProfile] = await Promise.all([
      donorProfile.findOne({ userId }).lean(),
      UserInterestProfile.findOne({ userId }).lean()
    ]);

    console.log("User Profile fetched:", userProfile);

    console.log("User Interest Profile fetched:", interestProfile);

    // 🔹 Build query text
    const queryText = await buildQueryTextForUser(
      userId,
      userProfile,
      interestProfile
    );
    if (!queryText) return [];

    console.log("Query Text:", queryText);

    // 🔹 Semantic retrieval (NO filtering here)
    const semanticResults = await findSimilarCampaigns(queryText, {
      topK: 100,         // higher recall and buffer for inactive campaigns
      minSimilarity: 0   // IMPORTANT: no filtering
    });

    if (!semanticResults.length) return [];

    console.log(
      `Found ${semanticResults.length} semantic candidates for user ${userId}`
    );

    // 🔹 Fetch campaigns
    const campaignIds = [...new Set(
      semanticResults.map(r => r.campaignId.toString())
    )];

    const now = new Date();

    const campaigns = await Campaign.find({
      _id: { $in: campaignIds },
      status: "ACTIVE",
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).lean();

    // 🔹 Map campaigns by ID
    const campaignMap = new Map();
    campaigns.forEach(c => {
      campaignMap.set(c._id.toString(), c);
    });

    // 🔹 Build scored list (PRESERVE semantic order)
    const scoredCampaigns = semanticResults
      .map(r => {
        const campaign = campaignMap.get(r.campaignId.toString());
        if (!campaign) return null;

        const lrbs = computeLRBSScore(userProfile, campaign, interestProfile);

        const semanticScore = r.similarityScore;
        const finalScore = semanticScore + lrbs.finalScore;

        return {
          campaign,
          semanticScore,
          categoryScore: lrbs.categoryScore,
          locationScore: lrbs.locationScore,
          urgencyScore: lrbs.urgencyScore,
          distance: lrbs.distance,
          finalScore
        };
      })
      .filter(Boolean);

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



// 🚀 COSINE SIMILARITY
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



// 🚀 SEMANTIC SEARCH (FIXED)
export const findSimilarCampaigns = async (
  queryText,
  {
    topK = 30,
    minSimilarity = 0 // 🔥 no early filtering
  } = {}
) => {
  try {
    // 🔹 Generate query embedding
    const queryVector = await generateQueryEmbedding(queryText);

    if (!queryVector || queryVector.length === 0) {
      console.error("Query embedding failed");
      return [];
    }

    // 🔹 Fetch campaign embeddings
    const campaignEmbeddings = await CampaignEmbedding.find()
      .select("campaignId embedding")
      .lean();

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

    const filteredCampaigns = scoredCampaigns
      .filter(({ similarityScore }) => similarityScore >= minSimilarity)
      .sort((a, b) => b.similarityScore - a.similarityScore);

    const uniqueCampaigns = [];
    const seenCampaignIds = new Set();

    for (const candidate of filteredCampaigns) {
      const campaignId = candidate.campaignId?.toString();
      if (!campaignId || seenCampaignIds.has(campaignId)) continue;

      seenCampaignIds.add(campaignId);
      uniqueCampaigns.push(candidate);

      if (uniqueCampaigns.length >= topK) break;
    }

    console.log(
      "Top similarity sample:",
      uniqueCampaigns.slice(0, 10)
    );

    return uniqueCampaigns;

    
  } catch (error) {
    console.error("Error in findSimilarCampaigns:", error);
    return [];
  }
};
