// Job scheduler for background tasks

import { reminderJobProcessor } from './reminderJobs';

export class JobScheduler {
  private intervals: NodeJS.Timeout[] = [];

  start(): void {
    console.log('Starting job scheduler...');

    // Process expiring items every hour
    const expiryJob = setInterval(async () => {
      console.log('Running expiry check job...');
      await reminderJobProcessor.processExpiredItems();
    }, 60 * 60 * 1000); // 1 hour

    // Process low stock items every 6 hours
    const lowStockJob = setInterval(async () => {
      console.log('Running low stock check job...');
      await reminderJobProcessor.processLowStockItems();
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Process scheduled reminders every 5 minutes
    const reminderJob = setInterval(async () => {
      console.log('Running scheduled reminders job...');
      await reminderJobProcessor.processScheduledReminders();
    }, 5 * 60 * 1000); // 5 minutes

    this.intervals.push(expiryJob, lowStockJob, reminderJob);

    // Run initial checks
    setTimeout(async () => {
      await reminderJobProcessor.processExpiredItems();
      await reminderJobProcessor.processLowStockItems();
      await reminderJobProcessor.processScheduledReminders();
    }, 5000); // Wait 5 seconds after startup
  }

  stop(): void {
    console.log('Stopping job scheduler...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }
}

export const jobScheduler = new JobScheduler();