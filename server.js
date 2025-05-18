require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const webpush = require('web-push');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB error:', err));

// VAPID setup
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Subscription model
const subscriptionSchema = new mongoose.Schema({
  endpoint: String,
  keys: { p256dh: String, auth: String },
  topics: [String]
});
const Subscription = mongoose.model('Subscription', subscriptionSchema);

// Routes
app.post('/subscribe', async (req, res) => {
  try {
    const { subscription, topics } = req.body;
    await Subscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { $set: { ...subscription, topics } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

app.post('/unsubscribe', async (req, res) => {
  try {
    await Subscription.deleteOne({ endpoint: req.body.endpoint });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

app.post('/send', async (req, res) => {
  try {
    const { topic, title, message, adminPin } = req.body;
    if (adminPin !== process.env.ADMIN_PIN) {
      return res.status(403).json({ error: 'Invalid admin PIN' });
    }

    const payload = JSON.stringify({ title, message });
    const subscriptions = await Subscription.find({ topics: topic });
    
    // Send notifications
    const results = await Promise.all(
      subscriptions.map(sub => 
        webpush.sendNotification(sub, payload).catch(err => {
          console.error('Failed to send:', err);
          return { error: err.message };
        })
      )
    );

    const successCount = results.filter(r => !r.error).length;
    res.json({ success: true, sentTo: successCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));