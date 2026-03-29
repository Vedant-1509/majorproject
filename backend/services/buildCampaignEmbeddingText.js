import axios from "axios";
import CampaignEmbedding from "../models/CampaignEmbedding.js";
import 'dotenv/config';
// 🔹 Manual semantic text construction
// export const buildCampaignEmbeddingText = (campaign) => {
//   return `
//     Title: ${campaign.title}
//     Description: ${campaign.description}
//     Category: ${campaign.category}
//     Campaign Type: ${campaign.campaignType}

//   `.trim();
// };

export const buildCampaignEmbeddingText = (campaign) => {
  return `
Title: ${campaign.title}

Description: ${campaign.description}

Category: ${campaign.category}

Campaign Type: ${campaign.campaignType}

Location: ${campaign.address?.city || ""}, ${campaign.address?.state || ""}, ${campaign.address?.country || ""}

${
  campaign.campaignType === "MONETARY"
    ? `Funding Goal: ${campaign.monetary?.targetAmount || 0}`
    : ""
}

${
  campaign.campaignType === "VOLUNTEER"
    ? `Required Skills: ${(campaign.volunteer?.requiredSkills || []).join(", ")}`
    : ""
}

${
  campaign.campaignType === "GOODS"
    ? `Goods Needed: ${(campaign.goods?.goodsType || []).join(", ")}`
    : ""
}

Start Date: ${campaign.startDate}
End Date: ${campaign.endDate}

`.trim();
};

// 🔹 Generate embedding using Cohere
export const generateEmbedding = async (text) => {
  try {
    const response = await axios.post(
      "https://api.cohere.ai/v1/embed",
      {
        model: "embed-english-v3.0",
        texts: [text],
        input_type: "search_document" // 👈 IMPORTANT
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.embeddings[0];
  } catch (error) {
    console.error(
      "Cohere embedding error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to generate embedding");
  }
};

// 🔹 Create campaign embedding (derived data)
export const createCampaignEmbedding = async (campaign) => {
  try {
    const text = buildCampaignEmbeddingText(campaign);
    const vector = await generateEmbedding(text);

    await CampaignEmbedding.findOneAndUpdate(
      { campaignId: campaign._id },
      {
        campaignId: campaign._id,
        embedding: vector,
        metadata: {
          ngoId: campaign.ngoId,
          category: campaign.category,
          campaignType: campaign.campaignType
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  } catch (error) {
    console.error(
      "Error saving campaign embedding:",
      error.message
    );
  }
};
