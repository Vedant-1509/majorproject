import Interaction from "../models/Interaction.model.js";

export const logInteraction = async ({
  userId,
  campaign,
  features,
  action,
  rankPosition
}) => {
  try {
    await Interaction.create({
      userId,
      campaignId: campaign._id,
      action,
      features,
      context: {
        category: campaign.category       
      },
      rankPosition
    });
  } catch (err) {
    console.error("Interaction log error:", err);
  }
};