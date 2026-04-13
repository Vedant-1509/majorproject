import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import Campaign from "../models/campaign.model.js";

const MONGO_URI = "mongodb://morevedant1509_db_user:ETVaR9tdDW919vLt@ac-jztqv2z-shard-00-00.xyfgcjd.mongodb.net:27017,ac-jztqv2z-shard-00-01.xyfgcjd.mongodb.net:27017,ac-jztqv2z-shard-00-02.xyfgcjd.mongodb.net:27017/?ssl=true&replicaSet=atlas-slywyq-shard-0&authSource=admin&appName=Cluster0";
const OUTPUT_FILE = path.resolve("datasetmaker", "synthetic_rank_dataset.csv");

const NUM_USERS = 150;
const MIN_CANDIDATES = 10;
const MAX_CANDIDATES = 22;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const encodeCampaignType = (type) => ({
  monetary: type === "MONETARY" ? 1 : 0,
  goods: type === "GOODS" ? 1 : 0,
  volunteer: type === "VOLUNTEER" ? 1 : 0,
});

const campaignTypeForUserPreference = (preferredType, actualType) => {
  if (preferredType === actualType) return 1;
  return 0;
};

const makeFeatureRow = ({ userId, campaign, label, semanticScore, locationScore, categoryScore }) => {
  const typeBits = encodeCampaignType(campaign.campaignType);
  return {
    userId,
    campaignId: campaign._id.toString(),
    label,
    semanticScore: clamp01(semanticScore),
    locationScore: clamp01(locationScore),
    categoryScore,
    monetary: typeBits.monetary,
    goods: typeBits.goods,
    volunteer: typeBits.volunteer,
  };
};

const scoreCampaign = (candidate) => {
  const typeBoost = candidate.categoryScore ? 0.18 : -0.05;
  const typeMatchBoost = (candidate.monetary || candidate.goods || candidate.volunteer) ? 0.08 : 0;
  const noise = (Math.random() - 0.5) * 0.12;
  return clamp01(
    0.68 * candidate.semanticScore +
    0.22 * candidate.locationScore +
    0.10 * candidate.categoryScore +
    typeBoost +
    typeMatchBoost +
    noise
  );
};

const labelFromScore = (score) => {
  if (score >= 0.78) return 5;
  if (score >= 0.52) return 2;
  return 1;
};

const generate = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required in the environment");
  }

  await mongoose.connect(MONGO_URI);

  const campaigns = await Campaign.find({})
    .select("_id campaignType category address.city")
    .lean();

  if (!campaigns.length) {
    throw new Error("No campaigns found in the database");
  }

  const rows = [];
  const header = [
    "queryId",
    "campaignId",
    "label",
    "semanticScore",
    "locationScore",
    "categoryScore",
    "monetary",
    "goods",
    "volunteer",
  ];
  rows.push(header.join(","));

  for (let u = 0; u < NUM_USERS; u++) {
    const userId = `user_${u}`;
    const preferredType = pick(["MONETARY", "GOODS", "VOLUNTEER"]);
    const preferredCategory = pick([...new Set(campaigns.map((c) => c.category).filter(Boolean))]);

    const candidateCount = Math.floor(Math.random() * (MAX_CANDIDATES - MIN_CANDIDATES + 1)) + MIN_CANDIDATES;
    const candidates = [];

    for (let i = 0; i < candidateCount; i++) {
      const campaign = pick(campaigns);
      const typeMatch = campaignTypeForUserPreference(preferredType, campaign.campaignType);
      const categoryMatch = preferredCategory && campaign.category === preferredCategory ? 1 : 0;

      const semanticScore = clamp01(
        0.15 +
        0.55 * typeMatch +
        0.20 * categoryMatch +
        Math.random() * 0.25
      );

      const locationScore = clamp01(
        0.10 +
        (categoryMatch ? 0.45 : 0.12) +
        Math.random() * 0.35
      );

      const categoryScore = categoryMatch;
      const row = makeFeatureRow({
        userId,
        campaign,
        label: 1,
        semanticScore,
        locationScore,
        categoryScore,
      });

      candidates.push({
        ...row,
        score: scoreCampaign(row),
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      const rankAwareLabel = i === 0 ? 5 : i <= 3 ? 2 : 1;
      rows.push([
        item.userId,
        item.campaignId,
        rankAwareLabel,
        item.semanticScore.toFixed(6),
        item.locationScore.toFixed(6),
        item.categoryScore,
        item.monetary,
        item.goods,
        item.volunteer,
      ].join(","));
    }
  }

  fs.writeFileSync(OUTPUT_FILE, rows.join("\n"));
  console.log(`Wrote ${rows.length - 1} rows to ${OUTPUT_FILE}`);

  await mongoose.disconnect();
};

generate().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
