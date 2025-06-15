export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { refreshToken } = req.body;
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error refreshing token:", errorData);
      return res.status(500).json({ error: "Failed to refresh token" });
    }

    const data = await response.json();
    const { access_token, expires_in } = data;
    return res.status(200).json({
      accessToken: access_token,
      expiresIn: expires_in,
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    return res.status(500).json({ error: "Failed to refresh token" });
  }
}
