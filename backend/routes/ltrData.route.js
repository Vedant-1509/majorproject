// routes/ltrData.route.js

import express from "express";
import Interaction from "../models/Interaction.model.js";

const router = express.Router();

// 🔥 GET ALL INTERACTIONS FOR LTR DATASET
router.get("/ltr-dataset", async (req, res) => {
  try {
    const interactions = await Interaction.find({})
      .select("userId campaignId action features rankPosition createdAt")
      .lean();

    return res.status(200).json({
      success: true,
      count: interactions.length,
      data: interactions
    });

  } catch (error) {
    console.error("Error fetching LTR dataset:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch LTR dataset"
    });
  }
});

export default router;