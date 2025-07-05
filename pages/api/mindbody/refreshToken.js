// Refresh mindbody access token

import { NextApiRequest, NextApiResponse } from 'next';
import { db } from "../../../firebaseConfig";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  getDoc,
} from "firebase/firestore";

export default async function handler(req, res) {
  const { refreshToken, userId, siteId } = req.body;
  if (!refreshToken) {
    return res.status(400).send('Missing Token');
  }

  const clientId = process.env.MINDBODY_CLIENT_ID;
  const clientSecret = process.env.MINDBODY_CLIENT_SECRET;
  const redirectUri = process.env.MINDBODY_REDIRECT_URI;
  const subscriberId = siteId;

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', clientId || '');
  params.append('client_secret', clientSecret || '');
  params.append('refresh_token', refreshToken);
  params.append('redirect_uri', redirectUri || '');
  params.append('subscriberId', subscriberId || '');

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

    // Save new tokens to user profile in your database firebase
    const userRef = doc(db, 'Users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    const mindbodyTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      updatedAt: new Date().toISOString(),
    };
    // Update or create Mindbody tokens in user profile
    await updateDoc(userRef, {
      mindbody: mindbodyTokens,
    });
    return res.status(200).json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error('Mindbody token error:', err);
    res.status(500).send('Token exchange failed');
  }
}
