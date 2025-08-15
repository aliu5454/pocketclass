export default function (req, res) {
	let nodemailer = require("nodemailer");

	console.log('Email API called with:', req.body);

	//Put email address where you want receive the emails
	const toMailList = [
		"contact.pocketclass@gmail.com",
		"aliu5454@gmail.com",
		"contact@pocketclass.ca"
	];

	var message = {
		from: '"PocketClass Support" <contact.pocketclass@gmail.com>',
		to: toMailList,
		...req.body,
	};

	// Check if Gmail credentials are available
	if (!process.env.EMAIL || !process.env.PASS) {
		console.error('Gmail credentials not configured. EMAIL:', !!process.env.EMAIL, 'PASS:', !!process.env.PASS);
		
		// For now, just log the support request and return success
		console.log('Support request received:', {
			from: req.body.from,
			subject: req.body.subject,
			html: req.body.html,
			timestamp: new Date().toISOString()
		});
		
		return res.status(200).json({ 
			message: "Support request logged successfully", 
			note: "Email credentials not configured - request logged to console" 
		});
	}

	nodemailer
		.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL,
				pass: process.env.PASS,
			},
			port: 465,
			host: "smtp.gmail.com",
		})
		.sendMail(message, (err) => {
			if (err) {
				console.error('Email sending error:', err);
				res.status(400).json({ error: err.message });
			} else {
				console.log('Email sent successfully');
				res.status(200).json({ message: "Email Sent Successfully" });
			}
		});
}
