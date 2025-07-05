export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { siteID } = req.body;
  const response = await fetch(`https://api.mindbodyonline.com/public/v6/site/activationcode`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.MINDBODY_API_KEY,
      'SiteID': siteID,
    },
  });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Mindbody API Error:', errorData);
        return res.status(response.status).json({ message: errorData.Message || 'Failed to fetch activation code' });
    }
    const data = await response.json();
    return res.status(200).json({
        data: data,
        message: 'Activation code fetched successfully',
    });
  
}