// // import axios from "axios";
// // import GeoAddress from "../models/GeoAddress.model.js";
// // import { getMapplsToken } from "./mapplsToken.service.js";
// // const ROAD_ALIASES = {
// //   "rajpath marg": "kartavya path",
// // };

// // const normalizeAddress = (address) =>
// //   address.trim().toLowerCase().replace(/\s+/g, " ");

// // const buildAddressString = (address) =>
// //   [
// //     address?.street,
// //     address?.city,
// //     address?.state,
// //     address?.zip,
// //     address?.country,
// //   ]
// //     .filter(Boolean)
// //     .join(", ");

// // export const geocodeAddress = async (addressInput) => {
// //   if (!addressInput) throw new Error("Address is required");

// //   const rawAddress = buildAddressString(addressInput);
// //   if (!rawAddress) throw new Error("Invalid address");

// //   const normalized = normalizeAddress(rawAddress);

// //   // 1️⃣ Cache check
// //   const cached = await GeoAddress.findOne({ address: normalized });
// //   if (cached) {
// //     return {
// //       latitude: cached.location.coordinates[1],
// //       longitude: cached.location.coordinates[0],
// //       cached: true,
// //     };
// //   }

// //   // 2️⃣ Get OAuth token
// //   const token = await getMapplsToken();

// //   // 3️⃣ Call Mappls Geocoding
// //   const response = await axios.get(
// //     "https://atlas.mappls.com/api/places/geocode",
// //     {
// //       params: {
// //         address: rawAddress,
// //         region: "IND",
// //       },
// //       headers: {
// //         Authorization: `Bearer ${token}`,
// //       },
// //       timeout: 5000,
// //     }
// //   );

// //   if (!response.data?.copResults?.length) {
// //     throw new Error("Address not found by Mappls");
// //   }

// //   const best = response.data.copResults[0];
// //   const lat = Number(best.latitude);
// //   const lng = Number(best.longitude);

// //   // 4️⃣ Save to cache
// //   await GeoAddress.create({
// //     address: normalized,
// //     location: {
// //       type: "Point",
// //       coordinates: [lng, lat],
// //     },
// //     provider: "mappls",
// //   });

// //   return {
// //     latitude: lat,
// //     longitude: lng,
// //     cached: false,
// //   };
// // };

// // const tryGeocode = async (addressString, token) => {
// //   const response = await axios.get(
// //     "https://atlas.mappls.com/api/places/geocode",
// //     {
// //       params: {
// //         address: addressString,
// //         region: "IND",
// //       },
// //       headers: {
// //         Authorization: `Bearer ${token}`,
// //       },
// //       timeout: 5000,
// //     }
// //   );
// //   return response.data?.copResults || [];
// // };

// // export const geocodeAddress = async (addressInput) => {
// //   const rawAddress = buildAddressString(addressInput);
// //   const normalized = normalizeAddress(rawAddress);

// //   // cache check omitted for brevity

// //   const token = await getMapplsToken();

// //   // 1️⃣ Try original address
// //   let results = await tryGeocode(rawAddress, token);
// //   console.log("Mappls results:", results);

// //   // 2️⃣ Fallback: renamed roads
// //   if (!results.length) {
// //     const lowered = rawAddress.toLowerCase();
// //     for (const [oldName, newName] of Object.entries(ROAD_ALIASES)) {
// //       if (lowered.includes(oldName)) {
// //         const fallbackAddress = lowered.replace(oldName, newName);
// //         results = await tryGeocode(fallbackAddress, token);
// //         if (results.length) break;
// //       }
// //     }
// //   }

// //   if (!results.length) {
// //     throw new Error("Address not found by Mappls");
// //   }

// //   const best = results[0];
// //   const lat = Number(best.latitude);
// //   const lng = Number(best.longitude);

// //   // save cache …

// //   return { latitude: lat, longitude: lng };
// // };


// import axios from "axios";
// import GeoAddress from "../models/GeoAddress.model.js";
// import { getMapplsToken } from "./mapplsToken.service.js";

// const ROAD_ALIASES = {
//   "rajpath marg": "kartavya path",
// };


// const normalizeAddress = (address) =>
//   address.trim().toLowerCase().replace(/\s+/g, " ");

// // const buildAddressString = (address) =>
// //   [
// //     address?.street,
// //     address?.city,
// //     address?.state,
// //     address?.zip,
// //     address?.country,
// //   ]
// //     .filter(Boolean)
// //     .join(", ");

// const buildAddressString = ({ city, state, country }) => {
//   if (!city || !state || !country) {
//     throw new Error("city, state, and country are required");
//   }

//   return `${city}, ${state}, ${country}`;
// };

// const tryGeocode = async (addressString, token) => {
//   const response = await axios.get(
//     "https://atlas.mappls.com/api/places/geocode",
//     {
//       params: {
//         address: addressString,
//         region: "IND",
//       },
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//       timeout: 5000,
//     }
//   );

//   return response.data?.copResults || [];
// };

// /**
//  * Resolve eLoc → latitude & longitude
//  */
// // const resolveELoc = async (eLoc, token) => {
// //   const response = await axios.get(
// //     "https://apis.mappls.com/advancedmaps/v1/place_detail",
// //     {
// //       params: { place_id: eLoc },
// //       headers: {
// //         Authorization: `Bearer ${token}`,
// //       },
// //       timeout: 5000,
// //     }
// //   );

// //   const { lat, lng } = response.data || {};

// //   if (!lat || !lng) {
// //     throw new Error(`Failed to resolve eLoc: ${eLoc}`);
// //   }
// //   console.log("Place detail response:", response.data);


// //   return {
// //     latitude: Number(lat),
// //     longitude: Number(lng),
// //   };
// // };

// const resolveELoc = async (eLoc, token) => {
//   try {
//     console.log("Calling place_detail for eLoc:", eLoc);

//     const response = await axios.get(
//       "https://apis.mappls.com/advancedmaps/v1/place_detail",
//       {
//         params: { place_id: eLoc },
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//         timeout: 5000,
//       }
//     );

//     console.log("RAW place_detail response:", response.data);

//     const { lat, lng } = response.data || {};

//     if (!lat || !lng) {
//       throw new Error("lat/lng missing in place_detail response");
//     }

//     return {
//       latitude: Number(lat),
//       longitude: Number(lng),
//     };
//   } catch (err) {
//     console.error("Place detail FAILED");
//     console.error("Status:", err.response?.status);
//     console.error("Data:", err.response?.data);
//     throw err;
//   }
// };

// /**
//  * MAIN SERVICE
//  */
// export const geocodeAddress = async (addressInput) => {
//   const rawAddress = buildAddressString(addressInput);
//   const normalizedAddress = normalizeAddress(rawAddress);

//   // 🔹 Optional cache lookup (if you use GeoAddress)
//   const cached = await GeoAddress.findOne({
//     normalizedAddress,
//   }).lean();

//   if (cached) {
//     return {
//       latitude: cached.latitude,
//       longitude: cached.longitude,
//     };
//   }

//   const token = await getMapplsToken();

//   // 1️⃣ Primary geocode attempt
//   let results = await tryGeocode(rawAddress, token);
//   console.log("Mappls results:", results);

//   // 2️⃣ Road rename fallback
//   if (!results.length) {
//     const lowered = rawAddress.toLowerCase();
//     for (const [oldName, newName] of Object.entries(ROAD_ALIASES)) {
//       if (lowered.includes(oldName)) {
//         const fallbackAddress = lowered.replace(oldName, newName);
//         results = await tryGeocode(fallbackAddress, token);
//         if (results.length) break;
//       }
//     }
//   }
//   console.log("Post-fallback results:", results);

//   if (!results.length) {
//     throw new Error("Address not found by Mappls");
//   }

//   const best = results[0];

//   let latitude;
//   let longitude;

//   // 3️⃣ Direct coordinates
//   if (best.latitude && best.longitude) {
//     latitude = Number(best.latitude);
//     longitude = Number(best.longitude);
//   }
//   // 4️⃣ Resolve via eLoc
//   else if (best.eLoc) {
//     const resolved = await resolveELoc(best.eLoc, token);
//     latitude = resolved.latitude;
//     longitude = resolved.longitude;
//   } else {
//     throw new Error("Geocode result has neither coordinates nor eLoc");
//   }

//   if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
//     throw new Error("Invalid latitude/longitude resolved");
//   }

//   // 5️⃣ Save to cache
//   await GeoAddress.create({
//     normalizedAddress,
//     rawAddress,
//     latitude,
//     longitude,
//     geocodeLevel: best.geocodeLevel || "unknown",
//     confidenceScore: best.confidenceScore || null,
//     eLoc: best.eLoc || null,
//     source: "mappls",
//   });

//   return { latitude, longitude };
// };


import axios from "axios";
import GeoAddress from "../models/GeoAddress.model.js"
// 🔒 Stronger normalization (prevents cache duplication)
const normalizeAddress = (address) =>
  address
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

// 🔧 Build canonical address from structured input
const buildAddressString = (address) => {
  if (typeof address === "string") return address;

  const { city, state, country } = address || {};

  if (!city || !state || !country) {
    throw new Error("city, state, and country are required for geocoding");
  }

  return `${city}, ${state}, ${country}`;
};

export const geocodeAddress = async (addressInput) => {
  if (!addressInput) throw new Error("Address is required");

  console.log("Geocoding address input:", addressInput);
  // 1️⃣ Build geocoding-safe string
  const addressString = buildAddressString(addressInput);
  const normalizedAddress = normalizeAddress(addressString);

  // 2️⃣ Check MongoDB cache
  const cached = await GeoAddress.findOne({ address: normalizedAddress });
  if (cached) {
    return {
      latitude: cached.location.coordinates[1],
      longitude: cached.location.coordinates[0],
      cached: true,
    };
  }

  // 3️⃣ Call Nominatim ONLY if not cached
  const response = await axios.get(
    "https://nominatim.openstreetmap.org/search",
    {
      params: {
        q: addressString,
        format: "json",
        limit: 1,
      },
      headers: {
        "User-Agent": "geo-backend/1.0",
      },
      timeout: 5000,
      validateStatus: (status) => status < 500, // prevent axios crash
    }
  );

  if (response.status === 429) {
    throw new Error("Geocoding rate limit exceeded");
  }

  if (!response.data || !response.data.length) {
    throw new Error("Address not found");
  }

  const lat = Number(response.data[0].lat);
  const lng = Number(response.data[0].lon);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("Invalid geocoding response");
  }

  // 4️⃣ Save to MongoDB cache
  await GeoAddress.create({
    address: normalizedAddress,
    location: {
      type: "Point",
      coordinates: [lng, lat],
    },
  });

  return {
    latitude: lat,
    longitude: lng,
    cached: false,
  };
};
