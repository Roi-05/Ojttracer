const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { UPLOADS_DIR } = require('./middleware/upload');

// Import Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const dtrRoutes = require('./routes/dtr');
const documentRoutes = require('./routes/documents');
const templateRoutes = require('./routes/templates');
const announcementRoutes = require('./routes/announcements');
const studentRoutes = require('./routes/students');
const deploymentRoutes = require('./routes/deployment');
const companyRoutes = require('./routes/companies');
const internRoutes = require('./routes/interns');
const accomplishmentRoutes = require('./routes/accomplishments');
const evaluationRoutes = require('./routes/evaluations');
const importRoutes = require('./routes/import');
const locationRoutes = require('./routes/location');
const coordinatorRoutes = require('./routes/coordinators');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Mount Routes
// Dev: the Vite proxy strips "/api", so routes are served at the root.
// Prod: the browser calls "/api/*" directly, and the root is reserved for the React app.
const api = express.Router();
api.use('/auth', authRoutes);
api.use('/profile', profileRoutes);
api.use('/', dtrRoutes); // handles /dtr, /dtr/clock, /admin/dtr
api.use('/documents', documentRoutes);
api.use('/templates', templateRoutes);
api.use('/announcements', announcementRoutes);
api.use('/students', studentRoutes);
api.use('/deployment', deploymentRoutes);
api.use('/companies', companyRoutes);
api.use('/interns', internRoutes);
api.use('/accomplishments', accomplishmentRoutes);
api.use('/evaluations', evaluationRoutes);
api.use('/import', importRoutes);
api.use('/location', locationRoutes);
api.use('/coordinators', coordinatorRoutes);

app.use('/api', api);

if (process.env.NODE_ENV === 'production') {
  // Serve the built React app (vite build -> ../dist) with SPA fallback
  const distDir = path.join(__dirname, '../dist');
  app.use(express.static(distDir));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
} else {
  app.use('/', api);
}
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`Server listening on port ${port}`));
