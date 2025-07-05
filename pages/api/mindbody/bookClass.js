import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { 
    firstName, 
    lastName, 
    classId, 
    clientId = null, // Optional: if clientId is already known
    sendEmail = false,
    waitlist = false,
    requirePayment = false,
    test = false
  } = req.body;
  // Required parameters validation
  if (!classId) {
    return res.status(400).json({ message: 'Class ID is required' });
  }

  if (!clientId && (!firstName || !lastName)) {
    return res.status(400).json({ message: 'Either clientId or firstName and lastName are required' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header' });
  }

  const siteId = req.headers.siteid;
  if (!siteId) {
    return res.status(400).json({ message: 'SiteId header is required' });
  }

  // Get refresh token from headers for potential token refresh
  const refreshToken = req.headers.refreshtoken;
  const userId = req.headers.userid;

  // Function to make Mindbody API calls with token refresh capability
  const makeMindbodyRequest = async (url, method, body, token) => {
    const response = await fetch(`https://api.mindbodyonline.com/public/v6${url}`, {
      method,
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'Api-Key': process.env.MINDBODY_API_KEY,
        'SiteId': siteId
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    // If token is expired and we have refresh token, refresh and retry
    if (!response.ok && (response.status === 401 || response.status === 403) && refreshToken && userId) {
      
      const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/mindbody/refreshToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refreshToken,
          userId,
          siteId: siteId
        }),
      });
      
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const refreshData = await refreshResponse.json();
      
      // Retry API call with new access token
      const newAuthHeader = `Bearer ${refreshData.access_token}`;
      const retryResponse = await fetch(`https://api.mindbodyonline.com/public/v6${url}`, {
        method,
        headers: {
          'Authorization': newAuthHeader,
          'Content-Type': 'application/json',
          'Api-Key': process.env.MINDBODY_API_KEY,
          'SiteId': siteId
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      const retryData = await retryResponse.json();
      
      if (!retryResponse.ok) {
        console.error('Mindbody API error after token refresh:', retryData);
        throw new Error(retryData.Message || `Failed to execute ${method} request to Mindbody after token refresh`);
      }
      
      return retryData;
    } else if (!response.ok) {
      console.error('Mindbody API error:', data);
      throw new Error(data.Message || `Failed to execute ${method} request to Mindbody`);
    }
    
    return data;
  };

  try {
    // Step 1 (if needed): Add a new client if clientId is not provided
    let clientIdToUse = clientId;
    
    if (!clientIdToUse) {
      const addClientBody = {
        FirstName: firstName,
        LastName: lastName,
        AccountBalance: 0,
        Action: "Added",
        Active: true,
        BirthDate: new Date(2002, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
        // Optional fields can be added if provided
      };
      
      console.log("Adding new client to Mindbody");
      const clientData = await makeMindbodyRequest('/client/addclient', 'POST', addClientBody, authHeader);
      
      if (!clientData.Client || !clientData.Client.Id) {
        throw new Error('Failed to create client in Mindbody');
      }
      
      clientIdToUse = clientData.Client.Id;
      console.log(`New client created with ID: ${clientIdToUse}`);
    }
    
    // Step 2: Add client to class
    const addToClassBody = {
      ClientId: clientIdToUse,
      ClassId: parseInt(classId, 10),
      Test: test,
      RequirePayment: requirePayment,
      Waitlist: waitlist,
      SendEmail: sendEmail
    };
    
    console.log(`Adding client ${clientIdToUse} to class ${classId}`);
    const bookingData = await makeMindbodyRequest('/class/addclienttoclass', 'POST', addToClassBody, authHeader);
    
    // Return successful booking information
    res.status(200).json({
      success: true,
      message: 'Client successfully added to class',
      booking: bookingData
    });
    
  } catch (error) {
    console.error('Error booking Mindbody class:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to book class in Mindbody'
    });
  }
}