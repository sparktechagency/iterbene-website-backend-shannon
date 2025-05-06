import colors from 'colors';
import { Server, Socket } from 'socket.io';
import { logger } from '../shared/logger';
import mongoose from 'mongoose';
import { User } from '../modules/user/user.model';

declare module 'socket.io' {
  interface Socket {
    userId?: string;
  }
}

const socket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info(colors.blue('🔌🟢 A user connected'));

    socket.on('user-connected', (userId: string) => {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        logger.error(colors.red(`Invalid user ID: ${userId}`));
        return;
      }

      socket.userId = userId;
      socket.join(userId); // Join the room for the specific user
      logger.info(
        colors.green(`User ${userId} joined their notification room`)
      );
    });

    socket.on('user/connect', async ({ userId }) => {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        logger.error(colors.red(`Invalid user ID: ${userId}`));
        return;
      }

      try {
        socket.userId = userId;
        socket.join(userId);
        socket.broadcast.to(userId).emit('user/inactivate', true);

        await User.updateOne({ _id: userId }, { $set: { isOnline: true } });
        socket.broadcast.emit('user/connect', userId);

        logger.info(colors.green(`User ${userId} is now online.`));
      } catch (error) {
        logger.error(colors.red(`Error in user/connect: ${error}`));
      }
    });

    const handleDisconnect = async () => {
      if (!socket.userId || !mongoose.Types.ObjectId.isValid(socket.userId)) {
        return;
      }
      try {
        await User.updateOne(
          { _id: socket.userId },
          { $set: { isOnline: false } }
        );
        socket.broadcast.emit('user/disconnect', socket.userId);
        logger.info(colors.yellow(`User ${socket.userId} is now offline.`));
      } catch (error) {
        logger.error(colors.red(`Error in handleDisconnect: ${error}`));
      }
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('user/disconnect', handleDisconnect);
  });
};

export const socketHelper = { socket };
