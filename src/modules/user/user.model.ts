import { model, Schema, Types } from 'mongoose';
import { TUser, UserModal } from './user.interface';
import paginate from '../../common/plugins/paginate';
import bcrypt from 'bcrypt';
import { config } from '../../config';
import { Gender, MaritalStatus, UserStatus } from './user.constant';
import { Roles } from '../../middlewares/roles';
// User Schema Definition
const userSchema = new Schema<TUser, UserModal>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
    },
    nickname: {
      type: String,
      required: [true, 'Nickname is required'],
      unique: true,
      trim: true,
    },
    profilePicture: {
      type: String,
      required: false,
      default: '/uploads/users/user.png',
    },
    coverPicture: {
      type: String,
      required: false,
      default: '/uploads/users/user.png',
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
    },
    aboutMe: {
      type: String,
      required: [false, 'About me is required'],
      trim: true,
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
      enum: {
        values: MaritalStatus,
        message: '{VALUE} is not a valid marital status',
      },
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
      default: 'user',
    },
    profession: { type: String },
    age: { type: Number },
    country: { type: String },
    city: { type: String },
    state: { type: String },
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

// Export the User model
export const User = model<TUser, UserModal>('User', userSchema);
