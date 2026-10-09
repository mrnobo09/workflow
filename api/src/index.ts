import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import type { Request, Response } from 'express';
import { config } from './config.js';
import { connectDB } from './db.config.js';
import authRouter from './routes/auth.js';
import jobsRouter from './routes/jobs.js';
import notificationsRouter from './routes/notifications.js';
import notificationStreamRouter from './routes/sse/notification.js';
import specialtiesRouter from './routes/specialties.js';
import teamRouter from './routes/team.js';
import workersRouter from './routes/workers.js';
import { ensureAudioBucket } from './storage/minio.js';
import { redis } from './storage/redis.js';
import { attachAudioSocket } from './routes/audio/ws/index.js';
import { startJobStatusWatcher } from './services/jobs/statusWatcher.js';
import { startNotificationService } from './services/notifications/service.js';
import { startOutboxRelay } from './services/outbox/relay.js';

dotenv.config();

const app = express();
const PORT = config.port || 3000;

app.use(cors({
  origin: config.clientOrigin,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/jobs', jobsRouter);
app.use('/workers', workersRouter);
app.use('/team', teamRouter);
app.use('/specialties', specialtiesRouter);
app.use('/notifications', notificationsRouter);
app.use('/sse/notifications', notificationStreamRouter);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

const startServer = async () => {
  await connectDB();
  await ensureAudioBucket();

  const stopWatcher = startJobStatusWatcher();
  const stopRelay = startOutboxRelay();
  const stopNotifications = startNotificationService();

  const server = createServer(app);
  attachAudioSocket(server);

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    server.closeAllConnections();
    server.close();
    await Promise.allSettled([stopWatcher(), stopRelay(), stopNotifications()]);
    redis.disconnect();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
};

startServer();
