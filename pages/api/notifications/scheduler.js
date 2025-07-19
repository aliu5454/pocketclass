import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { automationType } = req.body;
  
  try {
    const results = {};
    const baseUrl = process.env.NODE_ENV === 'production' ? 
      'https://www.pocketclass.ca' : 'http://localhost:3000';

    // If specific automation type is requested
    if (automationType) {
      const response = await fetch(`${baseUrl}/api/notifications/${automationType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      results[automationType] = result;
      
      return res.status(200).json({
        success: true,
        message: `Executed ${automationType} automation`,
        results
      });
    }

    // Run all time-based automations
    const timeBasedAutomations = [
      'upcomingClassReminder',
      'oneHourReminder', 
      'reminderRebook',
      'birthdaySpecial',
      'winBackLapsed'
    ];

    console.log('Running scheduled automation tasks...');

    const promises = timeBasedAutomations.map(async (automation) => {
      try {
        const response = await fetch(`${baseUrl}/api/notifications/${automation}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        return { automation, result };
      } catch (error) {
        console.error(`Error running ${automation}:`, error);
        return { 
          automation, 
          result: { success: false, error: error.message } 
        };
      }
    });

    const automationResults = await Promise.all(promises);
    
    // Format results
    automationResults.forEach(({ automation, result }) => {
      results[automation] = result;
    });

    // Calculate totals
    const totalEmailsSent = automationResults.reduce((total, { result }) => {
      return total + (result.emailsSent || 0);
    }, 0);

    const successfulAutomations = automationResults.filter(({ result }) => result.success).length;

    console.log(`Scheduled automation tasks completed. Total emails sent: ${totalEmailsSent}`);

    return res.status(200).json({
      success: true,
      message: `Executed ${timeBasedAutomations.length} scheduled automations`,
      totalEmailsSent,
      successfulAutomations,
      totalAutomations: timeBasedAutomations.length,
      results
    });

  } catch (error) {
    console.error('Error in automation scheduler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute scheduled automations',
      error: error.message
    });
  }
}
