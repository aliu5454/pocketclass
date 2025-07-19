import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { template } = req.query;

  if (!template) {
    return res.status(400).json({ error: 'Template name is required' });
  }

  try {
    const templatePath = path.join(process.cwd(), 'email-templates', template);
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    
    // Replace template variables with sample data
    const sampleData = {
      studentFirstName: 'Alex',
      studentLastName: 'Johnson',
      instructorFirstName: 'Sarah',
      instructorLastName: 'Williams',
      className: 'Yoga for Beginners',
      classDate: 'Monday, July 21, 2025',
      classTime: '10:00 AM',
      classDuration: '60 minutes',
      classLocation: 'Studio A, Downtown Wellness Center',
      timezone: 'EST',
      bookingId: 'PC123456',
      classDescription: 'A gentle introduction to yoga focusing on basic poses, breathing techniques, and relaxation. Perfect for beginners looking to improve flexibility and reduce stress.',
      oldClassDate: 'Sunday, July 20, 2025',
      oldClassTime: '2:00 PM',
      newClassDate: 'Monday, July 21, 2025',
      newClassTime: '10:00 AM',
      cancellationReason: 'instructor illness',
      refundAmount: '45.00',
      daysSinceLastClass: '21',
      lastClassName: 'Advanced Yoga Flow',
      lastClassDate: 'June 30, 2025',
      totalClassesCompleted: '8',
      favoriteInstructorName: 'Sarah Williams',
      favoriteInstructorFirstName: 'Sarah',
      newInstructorCategories: 'Pilates and Meditation',
      newClassCount: '25',
      firstClassName: 'Yoga for Beginners',
      joinDate: 'July 1, 2025',
      preferredInstructorName: 'Sarah Williams',
      // Links (these would be dynamic in real implementation)
      rescheduleLink: 'https://www.pocketclass.ca/reschedule',
      cancelLink: 'https://www.pocketclass.ca/cancel',
      classDetailsLink: 'https://www.pocketclass.ca/class/details',
      contactLink: 'https://www.pocketclass.ca/contact',
      rebookLink: 'https://www.pocketclass.ca/rebook',
      reviewLink: 'https://www.pocketclass.ca/review',
      bookAgainLink: 'https://www.pocketclass.ca/book-again',
      exploreClassesLink: 'https://www.pocketclass.ca/classes',
      bookingLink: 'https://www.pocketclass.ca/book',
      instructorProfileLink: 'https://www.pocketclass.ca/instructor/sarah-williams',
      comebackBookingLink: 'https://www.pocketclass.ca/comeback',
      browseInstructorsLink: 'https://www.pocketclass.ca/instructors',
      favoriteInstructorLink: 'https://www.pocketclass.ca/instructor/sarah-williams',
      browseClassesLink: 'https://www.pocketclass.ca/classes',
      helpCenterLink: 'https://www.pocketclass.ca/help',
      contactLink: 'https://www.pocketclass.ca/contact'
    };

    let populatedContent = templateContent;
    
    // Replace all template variables
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      populatedContent = populatedContent.replace(regex, sampleData[key]);
    });

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(populatedContent);
  } catch (error) {
    console.error('Error serving email template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
