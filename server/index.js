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

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Mount Routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/', dtrRoutes); // handles /dtr, /dtr/clock, /admin/dtr
app.use('/documents', documentRoutes);
app.use('/templates', templateRoutes);
app.use('/announcements', announcementRoutes);
app.use('/students', studentRoutes);
app.use('/deployment', deploymentRoutes);
app.use('/companies', companyRoutes);
app.use('/interns', internRoutes);
app.use('/accomplishments', accomplishmentRoutes);
app.use('/evaluations', evaluationRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
