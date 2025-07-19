import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, amount, currency = 'cad', metadata = {} } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ message: 'Missing required fields: userId, amount' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Should already be in cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId,
        ...metadata,
      },
      description: 'PocketClass Premium Subscription (1 month)',
    });

    console.log('Premium payment intent created:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      userId: userId
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Error creating premium payment intent:', error);
    return res.status(500).json({
      message: 'Failed to create payment intent',
      error: error.message,
    });
  }
}
