import cron from 'node-cron';
import { User } from '../modules/user/user.model';
import { logger } from '../shared/logger';

// ✅ Auto-Unban Users When Ban Period Expires
const autoUnbanUsers = async () => {
  const now = new Date();

  try {
    const usersToUnban = await User.find({
      isBanned: true,
      banUntil: { $lte: now },
    });

    if (usersToUnban.length === 0) {
      logger.info('✅ No users found for unbanning.');
      return;
    }

    for (const user of usersToUnban) {
      user.isBanned = false;
      user.banUntil = null;
      await user.save();
      logger.info(`✅ Auto-Unbanned User: ${user._id}`);
    }
  } catch (error) {
    logger.error('❌ Error auto-unbanning users:', error);
  }
};

// ✅ Cron Job: Runs Every Day at Midnight
cron.schedule('0 0 * * *', async () => {
  logger.info(
    '🔄 Running Scheduled Unban, Subscription Expiry & Notification Check...'
  );
  await autoUnbanUsers();
  logger.info('✅ Scheduled tasks completed.');
});

export const NodeSchedulerService = {
  autoUnbanUsers
};
