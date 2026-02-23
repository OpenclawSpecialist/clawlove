const express = require('express');
const profileRoutes = require('./routes/profiles');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Routes
app.use('/api/profiles', profileRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'clawdlove-api' }));

app.listen(PORT, () => {
  console.log(`🐾 ClawdLove API running on port ${PORT}`);
});

module.exports = app;
