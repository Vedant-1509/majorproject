import mongoose from "mongoose";
import Interaction from "../models/Interaction.model.js";
import Campaign from "../models/campaign.model.js";
import fs from "fs";

const MONGO_URI = "mongodb://morevedant1509_db_user:ETVaR9tdDW919vLt@ac-jztqv2z-shard-00-00.xyfgcjd.mongodb.net:27017,ac-jztqv2z-shard-00-01.xyfgcjd.mongodb.net:27017,ac-jztqv2z-shard-00-02.xyfgcjd.mongodb.net:27017/?ssl=true&replicaSet=atlas-slywyq-shard-0&authSource=admin&appName=Cluster0";

// ============================================================
// 🎯 LABEL MAP
// ============================================================
const labelMap = {
  impression: 0,
  click: 2,
  donate: 5
};

const NEGATIVE_SAMPLE_RATIO = 2;

// ============================================================
// 🔥 ONE-HOT ENCODING
// ============================================================
const encodeCampaignType = (type) => {
  return [
    type === "MONETARY" ? 1 : 0,
    type === "GOODS" ? 1 : 0,
    type === "VOLUNTEER" ? 1 : 0
  ];
};

// ============================================================
// 🚀 MAIN FUNCTION
// ============================================================
const prepareDataset = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to DB");

  const logs = await Interaction.find({})
    .sort({ userId: 1, createdAt: 1 })
    .lean();

  const allCampaigns = await Campaign.find({})
    .select("_id")
    .lean();

  const allCampaignIds = allCampaigns.map(c => c._id.toString());

  const dataset = [];
  const userCampaignMap = {};
  const userInteractionCount = {};

  // ============================================================
  // 🔥 POSITIVE SAMPLES
  // ============================================================
  for (let log of logs) {
    const { userId, campaignId, features, action, createdAt } = log;

    if (!features || !campaignId) continue;

    const uId = userId.toString();
    const cId = campaignId.toString();

    if (!userCampaignMap[uId]) {
      userCampaignMap[uId] = new Set();
      userInteractionCount[uId] = 0;
    }

    userCampaignMap[uId].add(cId);
    userInteractionCount[uId]++;

    const cleanAction = action?.trim().toLowerCase();
    const label = labelMap[cleanAction] ?? 0;

    const campaignTypeFeatures = encodeCampaignType(features.campaignType);

    const distanceScore = features.distance
      ? 1 / (1 + features.distance)
      : 0;

    const now = Date.now();
    const ageHours = (now - new Date(createdAt)) / (1000 * 60 * 60);
    const recencyScore = Math.exp(-ageHours / 24);

    const interactionFrequency = userInteractionCount[uId];

    const featureVector = [
      features.semanticScore || 0,
      features.categoryScore || 0,
      features.locationScore || 0,
      distanceScore,
      features.urgencyScore || 0,
      ...campaignTypeFeatures,
      recencyScore,
      interactionFrequency
    ];

    dataset.push({
      userId: uId,
      campaignId: cId,
      label,
      features: featureVector
    });
  }

  console.log("✅ Positive samples:", dataset.length);

  // ============================================================
  // 🔴 NEGATIVE SAMPLING
  // ============================================================
  const negativeSamples = [];

  Object.keys(userCampaignMap).forEach(userId => {
    const interactedCampaigns = userCampaignMap[userId];

    const nonInteracted = allCampaignIds.filter(
      cId => !interactedCampaigns.has(cId)
    );

    const shuffled = nonInteracted.sort(() => 0.5 - Math.random());

    const sampleSize = Math.min(
      interactedCampaigns.size * NEGATIVE_SAMPLE_RATIO,
      shuffled.length
    );

    for (let i = 0; i < sampleSize; i++) {
      const campaignId = shuffled[i];

      const randomSemantic = Math.random() * 0.3;
      const randomDistance = Math.random() * 50;

      const featureVector = [
        randomSemantic,
        0,
        0,
        1 / (1 + randomDistance),
        0,
        0, 0, 0,
        0,
        0
      ];

      negativeSamples.push({
        userId,
        campaignId,
        label: 0,
        features: featureVector
      });
    }
  });

  console.log("🚫 Negative samples:", negativeSamples.length);

  // ============================================================
  // 🔹 MERGE DATA
  // ============================================================
  const finalDataset = [...dataset, ...negativeSamples];

  console.log("📦 Final dataset size:", finalDataset.length);

  // ============================================================
  // 💾 SAVE JSON (optional)
  // ============================================================
  fs.writeFileSync("dataset.json", JSON.stringify(finalDataset, null, 2));

  // ============================================================
  // 🔥 CSV CONVERSION
  // ============================================================

  const header = [
    "userId",
    "campaignId",
    "label",
    "semanticScore",
    "categoryScore",
    "locationScore",
    "distanceScore",
    "urgencyScore",
    "type_MONETARY",
    "type_GOODS",
    "type_VOLUNTEER",
    "recencyScore",
    "interactionFrequency"
  ];

  const csvRows = [];
  csvRows.push(header.join(","));

  finalDataset.forEach(row => {
    const csvRow = [
      row.userId,
      row.campaignId,
      row.label,
      ...row.features
    ];
    csvRows.push(csvRow.join(","));
  });

  fs.writeFileSync("dataset.csv", csvRows.join("\n"));

  console.log("✅ CSV file created: dataset.csv");

  process.exit();
};

prepareDataset();