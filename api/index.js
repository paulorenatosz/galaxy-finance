// SolarZ Finance API - Redeploy to apply environment variables
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'SolarZ Finance API', version: '2.0.0', status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Handler de CORS preflight para todas as rotas API
app.options('/api/:resource/:action(*)?', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Rotas com /api prefix
app.use('/api/supabase', supabaseRoute);
app.use('/api/google', googleRoute);
app.use('/api/slack', slackRoute);
app.use('/api/sheets', sheetsRoute);
app.use('/api/drive', driveRoute);
app.use('/api/users', usersRoute);
app.use('/api/convites', convitesRoute);

module.exports = app;
