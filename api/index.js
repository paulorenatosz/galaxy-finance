const express = require('express');
const cors = require('cors');
const supabaseRoute = require('./routes/supabase');
const googleRoute = require('./routes/google');
const slackRoute = require('./routes/slack');
const sheetsRoute = require('./routes/sheets');
const driveRoute = require('./routes/drive');
const usersRoute = require('./routes/users');
const convitesRoute = require('./routes/convites');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas (sem /api pois Vercel já roteia /api/* para aqui)
app.use('/supabase', supabaseRoute);
app.use('/google', googleRoute);
app.use('/slack', slackRoute);
app.use('/sheets', sheetsRoute);
app.use('/drive', driveRoute);
app.use('/users', usersRoute);
app.use('/convites', convitesRoute);

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'SolarZ Finance API', version: '2.0.0', status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Export for Vercel
module.exports = app;
