// services/queryEmbeddingService.js
import axios from "axios";
import 'dotenv/config';
import CampaignEmbedding from "../models/CampaignEmbedding.js";
import donorProfile from "../models/donarProfile.model.js";
import { buildQueryTextForUser } from "./buildQueryFromUserProfile.js";

export const getCandidateCampaigns = async (userId) => {
  const userProfile = await donorProfile.findOne({ userId }).lean();

  const queryText = await buildQueryTextForUser(userId, userProfile);
  if (!queryText) return [];

  return findSimilarCampaigns(queryText, { topK: 10 });
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


// utils/cosineSimilarity.js
export const cosineSimilarity = (a, b) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};



export const findSimilarCampaigns = async (
  queryText,
  {
    topK = 10,
    minSimilarity = 0.0
  } = {}
) => {
  // 1️⃣ Generate embedding for the query
  const queryVector = await generateQueryEmbedding(queryText);

  // 2️⃣ Fetch all campaign embeddings
  const campaignEmbeddings = await CampaignEmbedding.find().lean();

  // 3️⃣ Compute similarity scores
  const scoredCampaigns = campaignEmbeddings.map(doc => {
    const score = cosineSimilarity(queryVector, doc.embedding);

    return {
      campaignId: doc.campaignId,
      similarityScore: score
    };
  });

  // 4️⃣ Sort & filter
  return scoredCampaigns
    .filter(c => c.similarityScore >= minSimilarity)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, topK);
};
