import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import config from './config.js';
import syncFormResponses from './services/syncResponses.js';
import applicationsRoutes from './routes/applications.js';
import filesRoutes from './routes/files.js';
import authRoutes from './routes/auth.js';


import adminRoutes from './routes/admin.js';
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/admin', adminRoutes);

await syncFormResponses();
cron.schedule('*/5 * * * *', () => {
  console.log('Running scheduled response sync...');
  syncFormResponses();
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
