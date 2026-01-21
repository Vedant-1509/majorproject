import axios from "axios";

let cachedToken = null;
let tokenExpiryTime = null;

export const getMapplsToken = async () => {
  // If token exists and not expired, reuse it
  if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  const response = await axios.post(
    "https://outpost.mappls.com/api/security/oauth/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.MAPPLS_CLIENT_ID,
      client_secret: process.env.MAPPLS_CLIENT_SECRET,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const { access_token, expires_in } = response.data;

  cachedToken = access_token;
  tokenExpiryTime = Date.now() + expires_in * 1000 - 60_000; // refresh 1 min early

  return cachedToken;
};
