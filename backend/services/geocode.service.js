import axios from "axios";

export const getCoordinatesFromAddress = async (address) => {
  try {
    if (!address) {
      throw new Error("Address is required");
    }

    const apiKey = process.env.OPENCAGE_API_KEY;

    const response = await axios.get(
      "https://api.opencagedata.com/geocode/v1/json",
      {
        params: {
          q: address,
          key: apiKey,
          limit: 1
        }
      }
    );

    const results = response.data.results;

    if (!results || results.length === 0) {
      throw new Error("No coordinates found for address");
    }

    const { lat, lng } = results[0].geometry;

    // IMPORTANT: MongoDB expects [longitude, latitude]
    return [lng, lat];

  } catch (error) {
    console.error("Geocoding error:", error.message);
    throw error;
  }
};