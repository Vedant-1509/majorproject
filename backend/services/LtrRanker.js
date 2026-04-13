/**
 * ltrRanker.js — with full stderr logging for debugging
 */

import { spawn }         from "child_process";
import path              from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL_PATH = process.env.LTR_MODEL_PATH
  ?? path.resolve(__dirname, "xgb_ltr_model.json");

const INFER_PATH = process.env.LTR_INFER_PATH
  ?? path.resolve(__dirname, "ltr_infer.py");

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python";

const FEATURE_COLS = [
  "semanticScore",
  "locationScore",
  "categoryScore",
  "urgencyScore",
  "monetary",
  "goods",
  "volunteer",
];

export function getCampaignTypeFlags(campaignType) {
  const t = (campaignType || "").toLowerCase();
  return {
    monetary:  t === "monetary"  ? 1 : 0,
    goods:     t === "goods"     ? 1 : 0,
    volunteer: t === "volunteer" ? 1 : 0,
  };
}

export function buildFeatures(campaign, semanticScore, lrbs) {
  const typeFlags = getCampaignTypeFlags(campaign.campaignType);
  return {
    semanticScore,
    locationScore: lrbs.locationScore ?? 0,
    categoryScore: lrbs.categoryScore ?? 0,
    urgencyScore:  lrbs.urgencyScore  ?? 0,
    distance:      lrbs.distance      ?? 0,
    campaignType:  campaign.campaignType,
    ...typeFlags,
  };
}

function runPythonInference(featureList) {
  return new Promise((resolve, reject) => {
    const payload = featureList.map(f =>
      Object.fromEntries(FEATURE_COLS.map(col => [col, f[col] ?? 0]))
    );

    console.log("[LTR] Spawning Python:");
    console.log("      PYTHON_BIN :", PYTHON_BIN);
    console.log("      INFER_PATH :", INFER_PATH);
    console.log("      MODEL_PATH :", MODEL_PATH);
    console.log("      Rows       :", payload.length);

    const proc = spawn(PYTHON_BIN, [INFER_PATH, MODEL_PATH]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", chunk => { stdout += chunk; });

    // ── Print every stderr line from Python immediately ──────────────────
    proc.stderr.on("data", chunk => {
      stderr += chunk;
      process.stderr.write("[ltr_infer.py] " + chunk);   // live output
    });

    proc.on("close", code => {
      console.log(`[LTR] Python exited with code ${code}`);
      if (code !== 0) {
        return reject(new Error(
          `ltr_infer.py exited ${code}\n--- stderr ---\n${stderr.trim()}`
        ));
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) return reject(new Error(`[ltr_infer] ${result.error}`));
        resolve(result.scores);
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${stdout.trim()}`));
      }
    });

    proc.on("error", err =>
      reject(new Error(
        `Failed to spawn "${PYTHON_BIN}": ${err.message}\n` +
        `Check PYTHON_BIN in your .env — it must point to the venv python.exe`
      ))
    );

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

export async function rankCampaigns(scoredCampaigns) {
  if (!scoredCampaigns.length) return [];

  try {
    const scores = await runPythonInference(
      scoredCampaigns.map(item => item.features)
    );

    const ranked = scoredCampaigns.map((item, i) => ({
      ...item,
      ltrScore: scores[i],
    }));

    ranked.sort((a, b) => b.ltrScore - a.ltrScore);
    return ranked;

  } catch (err) {
    console.error("[LTR] Inference failed, falling back to semanticScore order:");
    console.error(err.message);
    return scoredCampaigns
      .map(item => ({ ...item, ltrScore: item.features.semanticScore ?? 0 }))
      .sort((a, b) => b.ltrScore - a.ltrScore);
  }
}