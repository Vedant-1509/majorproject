import mongoose from "mongoose";
import fs from "fs";
import Campaign from "../models/campaign.model.js";

const MONGO_URI = "mongodb://moreve,....................";

const NUM_USERS = 80;
const INTERACTIONS_PER_USER = 25;

const getLocationScore = (distance) => Math.exp(-distance / 65);

// ============================================================
// 🚀 MAIN
// ============================================================
const generateDataset = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to DB");

  const campaigns = await Campaign.find({})
    .select("_id category campaignType")
    .lean();

  const rows = [];

  rows.push([
    "userId",
    "campaignId",
    "label",
    "semanticScore",
    "categoryScore",
    "locationScore",
    "urgencyScore",
    "monetary",
    "goods",
    "volunteer"
  ].join(","));

  // ============================================================
  // 🔥 GENERATE USERS
  // ============================================================
  for (let u = 0; u < NUM_USERS; u++) {
    const userId = `user_${u}`;

    const preferredCategory =
      campaigns[Math.floor(Math.random() * campaigns.length)].category;

    const preferredType =
      ["MONETARY", "GOODS", "VOLUNTEER"][
        Math.floor(Math.random() * 3)
      ];

    // ============================================================
    // 🔥 SPLIT CAMPAIGNS
    // ============================================================
    const matching = campaigns.filter(
      c => c.category === preferredCategory
    );

    const nonMatching = campaigns.filter(
      c => c.category !== preferredCategory
    );

    // ============================================================
    // 🔥 GENERATE INTERACTIONS
    // ============================================================
    for (let i = 0; i < INTERACTIONS_PER_USER; i++) {

      let campaign;
      let label;

      // 🎯 30% DONATIONS (high relevance)
      if (i < 8 && matching.length > 0) {
        campaign = matching[Math.floor(Math.random() * matching.length)];

        const semanticScore = 0.8 + Math.random() * 0.2;
        const locationScore = getLocationScore(Math.random() * 5);

        label = 5;

        rows.push(formatRow(userId, campaign, label, semanticScore, 1, locationScore, preferredType));
      }

      // 🎯 40% CLICKS (medium relevance)
      else if (i < 18) {
        campaign = matching[Math.floor(Math.random() * matching.length)];

        const semanticScore = 0.5 + Math.random() * 0.3;
        const locationScore = getLocationScore(Math.random() * 20);

        label = 2;

        rows.push(formatRow(userId, campaign, label, semanticScore, 1, locationScore, preferredType));
      }

      // 🎯 30% IMPRESSIONS (hard negatives)
      else {
        campaign = nonMatching[Math.floor(Math.random() * nonMatching.length)];

        const semanticScore = 0.3 + Math.random() * 0.3;
        const locationScore = getLocationScore(20 + Math.random() * 80);

        label = 0;

        rows.push(formatRow(userId, campaign, label, semanticScore, 0, locationScore, preferredType));
      }
    }
  }

  fs.writeFileSync("synthetic_dataset.csv", rows.join("\n"));

  console.log("✅ HIGH-QUALITY dataset created");
  process.exit();
};

// ============================================================
// 🔥 ROW FORMATTER
// ============================================================
const formatRow = (
  userId,
  campaign,
  label,
  semanticScore,
  categoryScore,
  locationScore,
  preferredType
) => {

  const urgencyScore = Math.random();

  const monetary = campaign.campaignType === "MONETARY" ? 1 : 0;
  const goods = campaign.campaignType === "GOODS" ? 1 : 0;
  const volunteer = campaign.campaignType === "VOLUNTEER" ? 1 : 0;

  return [
    userId,
    campaign._id.toString(),
    label,
    semanticScore,
    categoryScore,
    locationScore,
    urgencyScore,
    monetary,
    goods,
    volunteer
  ].join(",");
};

generateDataset();