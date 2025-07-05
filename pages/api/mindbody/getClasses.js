import { ref } from "firebase/storage";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const siteId = req.query.siteId;
  const classDescriptionID = req.query.classDescriptionID;
  const refreshToken = req.headers.refreshtoken; // Get refresh token from headers
  const userId = req.headers.userid; // Get user ID from headers
  
  if (!classDescriptionID) {
    console.error("Missing classDescriptionId query parameter");
    return res.status(400).json({ message: "Missing classDescriptionId query parameter" });
  }
  
  if (!siteId) {
    console.error("Missing SiteId header");
    return res.status(400).json({ message: "Missing SiteId header" });
  }
  
  if (!authHeader) {
    return res.status(401).json({ message: "No authorization header" });
  }

  // Function to fetch classes using the provided access token
  const fetchClassDetails = async (token) => {
    const params = new URLSearchParams();
    params.append("request.classDescriptionIds[0]", classDescriptionID.toString());
    // Add startDateTime As current time and endDateTime as 30 days from now
    params.append("request.startDateTime", new Date().toISOString());
    params.append("request.endDateTime", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const response = await fetch(
      `https://api.mindbodyonline.com/public/v6/class/classes?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "Api-Key": process.env.MINDBODY_API_KEY,
          SiteId: siteId,
        },
      }
    );
    
    return response;
  };

  try {
    // First attempt with the current token
    let response = await fetchClassDetails(authHeader);
    let data = await response.json();
    
    // If token is expired (401 Unauthorized) and refreshToken is provided
    if (!response.ok && (response.status === 401 || response.status === 403) && refreshToken && userId) {
      
      // Call token refresh API to get new tokens
      const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/mindbody/refreshToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refreshToken: refreshToken,
          userId: userId,
          siteId: siteId
        }),
      });
      
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const refreshData = await refreshResponse.json();
      // Retry API call with new access token
      const newAuthHeader = `Bearer ${refreshData.access_token}`;
      response = await fetchClassDetails(newAuthHeader);
      data = await response.json();
      
      // If still failing, throw error
      if (!response.ok) {
        console.error('Mindbody API error after token refresh:', data);
        throw new Error(data.Message || 'Failed to fetch class details from Mindbody after token refresh');
      }
      
      // Include the new token in the response so the client can update it
      res.status(200).json(
        data.Classes || [],
      );
      return;
    }
    else if (!response.ok) {
      console.error("Mindbody API error:", data);
      console.error("Response status:", response);
      throw new Error(data.Message || "Failed to fetch classes from Mindbody");
    }

    // Return properly formatted classes array according to Mindbody schema
    res.status(200).json(data.Classes || []);
  } catch (error) {
    console.error("Error fetching Mindbody classes:", error);
    res.status(500).json({ message: error.message });
  }
}
