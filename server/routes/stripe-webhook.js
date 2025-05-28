// routes/stripe-webhook.js
import stripePkg from "stripe";
import dotenv from "dotenv";
dotenv.config();

const stripe = stripePkg(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function webhookHandler(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log("🔔 Webhook received:", event.type);
  } catch (err) {
    console.error("❌ Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;

    try {
      const { default: User } = await import("../models/User.js");
      await User.findByIdAndUpdate(userId, { is_paid: true });
      console.log(`✅ User ${userId} marked as paid`);
    } catch (err) {
      console.error("❌ Failed to update user:", err.message);
    }
  }

  res.status(200).send("Webhook processed");
}
