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
const prepareDatasetCSV = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to DB");

    const logs = await Interaction.find({}).lean();
    console.log("📊 Total logs:", logs.length);

    const rows = [];

    // ============================================================
    // 📌 CSV HEADER
    // ============================================================
    const header = [
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
    ];

    rows.push(header.join(","));

    // ============================================================
    // 🔥 PROCESS EACH INTERACTION
    // ============================================================
    for (let log of logs) {
      const { userId, campaignId, features, action } = log;

      if (!features || !campaignId) continue;

      const uId = userId.toString();
      const cId = campaignId.toString();

      // 🔹 Label
      const cleanAction = action?.trim().toLowerCase();
      const label = labelMap[cleanAction] ?? 0;

      // ============================================================
      // 🔥 GET CAMPAIGN TYPE (IMPORTANT FIX)
      // ============================================================
      let campaignType = null;

      try {
        const campaign = await Campaign.findById(cId)
          .select("campaignType")
          .lean();

        campaignType = campaign?.campaignType || null;
      } catch (err) {
        campaignType = null;
      }

      const campaignTypeFeatures = encodeCampaignType(campaignType);

      // ============================================================
      // 🔥 FINAL FEATURE VECTOR (CLEAN)
      // ============================================================
      const row = [
        uId,
        cId,
        label,
        features.semanticScore || 0,
        features.categoryScore || 0,
        features.locationScore || 0,   // ✅ already distance-based
        features.urgencyScore || 0,
        ...campaignTypeFeatures
      ];

      rows.push(row.join(","));
    }

    // ============================================================
    // 💾 SAVE CSV
    // ============================================================
    fs.writeFileSync("dataset.csv", rows.join("\n"));

    console.log("✅ CSV file created successfully: dataset.csv");

    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

// Run script
prepareDatasetCSV();