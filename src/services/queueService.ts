import { sendVerificationEmail, sendResetPasswordEmail, sendLoginVerificationEmail } from '../helpers/emailService';
import { errorLogger, logger } from '../shared/logger';

// Email job types
export interface EmailJobData {
  type: 'verification' | 'reset-password' | 'login-mfa';
  email: string;
  otp: string;
  userName?: string;
}

// In-memory queue for Redis-free processing
class InMemoryQueue {
  private jobs: EmailJobData[] = [];
  private processing = false;
  private maxConcurrency = 3;
  private activeJobs = 0;

  async add(data: EmailJobData, priority = 0): Promise<void> {
    this.jobs.push(data);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processJobs();
    }
  }

  private async processJobs(): Promise<void> {
    this.processing = true;
    
    while (this.jobs.length > 0 && this.activeJobs < this.maxConcurrency) {
      const job = this.jobs.shift();
      if (job) {
        this.activeJobs++;
        this.processJob(job).finally(() => {
          this.activeJobs--;
        });
      }
    }

    // Stop processing when queue is empty
    if (this.jobs.length === 0 && this.activeJobs === 0) {
      this.processing = false;
    } else if (this.jobs.length > 0) {
      // Continue processing remaining jobs
      setTimeout(() => this.processJobs(), 100);
    }
  }

  private async processJob(job: EmailJobData): Promise<void> {
    const { type, email, otp } = job;
    
    try {
      switch (type) {
        case 'verification':
          await sendVerificationEmail(email, otp);
          logger.info(`Verification email sent to ${email}`);
          break;
        case 'reset-password':
          await sendResetPasswordEmail(email, otp);
          logger.info(`Reset password email sent to ${email}`);
          break;
        case 'login-mfa':
          await sendLoginVerificationEmail(email, otp);
          logger.info(`Login MFA email sent to ${email}`);
          break;
        default:
          throw new Error(`Unknown email type: ${type}`);
      }
    } catch (error) {
      errorLogger.error('Email job failed:', error);
      
      // Simple retry mechanism - add back to queue with delay
      setTimeout(() => {
        this.jobs.push(job);
      }, 5000);
    }
  }

  getQueueSize(): number {
    return this.jobs.length;
  }
}

// Create global queue instance
const emailQueue = new InMemoryQueue();

// Queue management functions
export const addEmailJob = async (data: EmailJobData, priority = 0): Promise<void> => {
  return emailQueue.add(data, priority);
};

// Get queue statistics
export const getQueueStats = () => {
  return {
    queueSize: emailQueue.getQueueSize(),
    status: 'running'
  };
};

export default emailQueue;