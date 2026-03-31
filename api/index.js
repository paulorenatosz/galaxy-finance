const { createServer } = require('node:http');
const { parse } = require('node:url');
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

// Rotas
app.use('/api/supabase', supabaseRoute);
app.use('/api/google', googleRoute);
app.use('/api/slack', slackRoute);
app.use('/api/sheets', sheetsRoute);
app.use('/api/drive', driveRoute);
app.use('/api/users', usersRoute);
app.use('/api/convites', convitesRoute);

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'SolarZ Finance API', version: '2.0.0', status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

module.exports = app;
