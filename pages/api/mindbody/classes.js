import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header' });
  }
  const siteId = req.headers.siteid;
  try {

    const response = await fetch(`https://api.mindbodyonline.com/public/v6/class/classes`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Api-Key': process.env.MINDBODY_API_KEY,
        'SiteId': siteId
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Mindbody API error:', data);
      throw new Error(data.Message || 'Failed to fetch classes from Mindbody');
    }

    // Return properly formatted classes array according to Mindbody schema
    res.status(200).json(data.Classes || []);
  } catch (error) {
    console.error('Error fetching Mindbody classes:', error);
    res.status(500).json({ message: error.message });
  }
}