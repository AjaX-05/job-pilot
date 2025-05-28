// routes/create-checkout-session.js
const express = require("express");
const router = express.Router();
require("dotenv").config(); // Make sure this is also in your main app file (e.g., app.js)

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const PRICE_ID = process.env.STRIPE_PRICE_ID;

router.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        "http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/payment-cancelled",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
