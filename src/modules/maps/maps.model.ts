import { model, Schema } from 'mongoose';
import { IMaps, IMapsModel } from './maps.interface';
import paginate from '../../common/plugins/paginate';

const mapsSchema = new Schema<IMaps, IMapsModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visitedLocation: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        visitedLocationName: { type: String, required: true },
      },
    ],
    interestedLocation: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        interestedLocationName: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

//apply plugin
mapsSchema.plugin(paginate);

export const Maps = model<IMaps, IMapsModel>('Maps', mapsSchema);
