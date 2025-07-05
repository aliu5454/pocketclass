import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
  const clientId = process.env.MINDBODY_CLIENT_ID;
  const redirectUri = process.env.MINDBODY_REDIRECT_URI;
  const subscriberId = req.query.siteId;
  const nonce = Math.random().toString(36).substring(2); // Required for ID token
  const state = subscriberId; // Can be used to maintain state between request and callback
  const scope = 'email profile openid offline_access Mindbody.Api.Public.v6';

  const authUrl = `https://signin.mindbodyonline.com/connect/authorize` +
    `?response_mode=form_post` +
    `&response_type=code%20id_token` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&subscriberId=${encodeURIComponent(subscriberId)}` +
    `&nonce=${encodeURIComponent(nonce)}` +
    `&state=${encodeURIComponent(state)}` + 
    `&staff=true`;

  res.redirect(authUrl);
}
