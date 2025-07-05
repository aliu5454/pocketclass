import { NextApiRequest, NextApiResponse } from 'next';
import { auth, db } from "../../firebaseConfig";

export default async function handler(req, res) {
  const { code } = req.body;
  if (!code) {
    return res.status(400).send('Missing code');
  }

  const clientId = process.env.MINDBODY_CLIENT_ID;
  const clientSecret = process.env.MINDBODY_CLIENT_SECRET;
  const redirectUri = process.env.MINDBODY_REDIRECT_URI;
  const subscriberId = req.body.state;

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', clientId || '');
  params.append('client_secret', clientSecret || '');
  params.append('code', code);
  params.append('redirect_uri', redirectUri || '');
  params.append('subscriberId', subscriberId || '');
  params.append('scope', 'email profile openid offline_access Mindbody.Api.Public.v6');

  try {
    const tokenRes = await fetch('https://signin.mindbodyonline.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error('Mindbody token exchange failed:', data);
      return res.status(500).json({ error: 'Token exchange failed', details: data });
    }

    const queryParams = new URLSearchParams({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: String(data.expires_in),
    }).toString();

    res.redirect(`/mindbody-success?${queryParams}`);
  } catch (err) {
    console.error('Mindbody token error:', err);
    res.status(500).send('Token exchange failed');
  }
}
