import mongoose, { Schema } from 'mongoose';
import {
  ConnectionStatus,
  IConnections,
  IConnectionsModel,
} from './connections.interface';
import paginate from '../../common/plugins/paginate';
import aggregatePaginate from '../../common/plugins/aggregatePaginate';

const connectionsSchema = new Schema<IConnections, IConnectionsModel>(
  {
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sent By User is required'],
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Received By User is required'],
    },
    status: {
      type: String,
      enum: Object.values(ConnectionStatus),
      default: ConnectionStatus.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

connectionsSchema.plugin(paginate);
connectionsSchema.plugin(aggregatePaginate)

export const Connections = mongoose.model<IConnections, IConnectionsModel>(
  'Connections',
  connectionsSchema
);
