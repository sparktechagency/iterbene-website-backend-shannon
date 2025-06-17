import { model, Schema } from 'mongoose';
import {
  ConnectionPrivacy,
  PrivacyVisibility,
  TUser,
  UserModal,
} from './user.interface';
import paginate from '../../common/plugins/paginate';
import bcrypt from 'bcrypt';
import { config } from '../../config';
import { Gender, UserStatus } from './user.constant';
import { Roles } from '../../middlewares/roles';

const userSchema = new Schema<TUser, UserModal>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    username: {
      type: String,
      required: [false, 'Username is required'],
      unique: true,
      trim: true,
    },
    nickname: {
      type: String,
      required: [false, 'Nickname is required'],
      trim: true,
    },
    profileImage: {
      type: String,
      required: false,
      default:
        'https://iter-bene.s3.eu-north-1.amazonaws.com/uploads/users/2c7bcbec-1c9f-476e-9daa-f4c8f947f520.jpg',
    },
    coverImage: {
      type: String,
      required: false,
      default:
        'https://marray-meet.s3.eu-north-1.amazonaws.com/cover.iter-bene.webp',
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    phoneNumber: {
      type: String,
      required: [false, 'Phone number is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: UserStatus,
      default: 'Active',
    },
    location: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },
    locationName: { type: String },
    address: { type: String },
    gender: {
      type: String,
      enum: {
        values: Gender,
        message: '{VALUE} is not a valid gender',
      },
      required: [false, 'Gender is required'],
    },
    maritalStatus: {
      type: String,
      required: [false, 'Marital status is required'],
    },
    description: { type: String },
    role: {
      type: String,
      enum: {
        values: Roles,
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
      default: 'User',
    },
    profession: { type: String },
    ageRange: { type: String },
    country: { type: String },
    city: { type: String },
    state: { type: String },
    referredAs: {
      type: String,
      required: false,
      trim: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banUntil: {
      type: Date,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isInMessageBox: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastPasswordChange: { type: Date },
    isResetPassword: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: { type: Date },
    privacySettings: {
      ageRange: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.ONLY_ME,
      },
      nickname: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.PUBLIC,
      },
      gender: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.ONLY_ME,
      },
      location: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.PUBLIC,
      },
      locationName: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.PUBLIC,
      },
      country: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.PUBLIC,
      },
      state: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.PUBLIC,
      },
      city: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.PUBLIC,
      },
      profession: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.PUBLIC,
      },
      aboutMe: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.PUBLIC,
      },
      phoneNumber: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.ONLY_ME,
      },
      maritalStatus: {
        type: String,
        enum: PrivacyVisibility,
        default: PrivacyVisibility.PUBLIC,
      },
    },
    connectionPrivacy: {
      type: String,
      enum: ConnectionPrivacy,
      default: ConnectionPrivacy.PUBLIC,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Apply the paginate plugin
userSchema.plugin(paginate);
// Static methods
userSchema.statics.isExistUserById = async function (id: string) {
  return await this.findById(id);
};

userSchema.statics.isExistUserByEmail = async function (email: string) {
  return await this.findOne({ email });
};

userSchema.statics.isMatchPassword = async function (
  password: string,
  hashPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashPassword);
};

// Middleware to hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt.saltRounds)
    );
  }
  next();
});

export const User = model<TUser, UserModal>('User', userSchema);
