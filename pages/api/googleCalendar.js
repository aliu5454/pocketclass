export default function handler(req, res) {
  try {
    const client_id = process.env.CLIENT_ID;
    const redirect_uri =
      "https://pocketclass-git-features-g-678fca-andrew-lius-projects-661c4054.vercel.app/api/calendarCallback";
    // const redirect_uri = "https://www.pocketclass.ca/api/calendarCallback";
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/calendar"
    );

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&access_type=offline&prompt=consent`;

    res.redirect(oauthUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to redirect to Google OAuth" });
  }
}
