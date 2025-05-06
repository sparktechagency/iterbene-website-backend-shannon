import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { User } from '../modules/user/user.model';

// Load environment variables
dotenv.config();

// Function to drop the entire database
const dropDatabase = async () => {
  try {
    await mongoose.connection.dropDatabase();
    console.log('------------> Database dropped successfully! <------------');
  } catch (err) {
    console.error('Error dropping database:', err);
  }
};

// Function to hash password
const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Function to seed users
const seedUsers = async () => {
  try {
    const usersData = [
      {
        fullName: 'Md Rakib Islam',
        email: 'rakib2020.tkg@gmail.com',
        password: 'Rakib244348',
        role: 'admin',
        isEmailVerified: true,
      },
      {
        fullName: 'John van der Merwe',
        email: 'johnvandermerwe@gmail.com',
        password: 'Password123',
        gender: 'Male',
        dateOfBirth: '1985-06-18',
        age: 38,
        continent: 'Africa',
        country: 'South Africa',
        state: 'Western Cape',
        city: 'Cape Town',
        address: 'Street 9, City 10',
        ethnicity: 'Afrikaner',
        denomination: 'Christian',
        education: "Master's",
        maritalStatus: 'Single',
        hobby: ['Surfing', 'Photography'],
        occupation: 'Photographer',
        interests: ['Nature', 'Adventure'],
        aboutMe: 'I love the outdoors and photography.',
        role: 'user',
        isEmailVerified: true,
      },
      {
        fullName: 'Heike Müller',
        email: 'heike.mueller@gmail.com',
        password: 'Password456',
        gender: 'Female',
        dateOfBirth: '1990-02-12',
        age: 33,
        continent: 'Europe',
        country: 'Germany',
        state: 'Bavaria',
        city: 'Munich',
        address: 'Street 20, City 35',
        ethnicity: 'German',
        denomination: 'Protestant',
        education: "Bachelor's",
        maritalStatus: 'Married',
        hobby: ['Cycling', 'Cooking'],
        occupation: 'Engineer',
        interests: ['Technology', 'Traveling'],
        aboutMe: 'I am passionate about technology and traveling.',
        role: 'user',
        isEmailVerified: true,
      },
      {
        fullName: 'Liam Botha',
        email: 'liambotha@gmail.com',
        password: 'Password789',
        gender: 'Male',
        dateOfBirth: '1987-08-25',
        age: 36,
        continent: 'Africa',
        country: 'South Africa',
        state: 'Gauteng',
        city: 'Johannesburg',
        address: 'Street 15, City 25',
        ethnicity: 'Zulu',
        denomination: 'Muslim',
        education: 'High School',
        maritalStatus: 'Single',
        hobby: ['Football', 'Gaming'],
        occupation: 'Software Developer',
        interests: ['Technology', 'Sports'],
        aboutMe: 'I am a software developer who loves football.',
        role: 'user',
        isEmailVerified: true,
      },
      {
        fullName: 'Sophia Schneider',
        email: 'sophia.schneider@gmail.com',
        password: 'Password101',
        gender: 'Female',
        dateOfBirth: '1992-11-30',
        age: 31,
        continent: 'Europe',
        country: 'Germany',
        state: 'Berlin',
        city: 'Berlin',
        address: 'Avenue 2, City 12',
        ethnicity: 'German',
        denomination: 'Catholic',
        education: 'PhD',
        maritalStatus: 'Divorced',
        hobby: ['Traveling', 'Reading'],
        occupation: 'Doctor',
        interests: ['Health', 'History'],
        aboutMe: 'I am a doctor with a passion for history.',
        role: 'user',
        isEmailVerified: true,
      },
      {
        fullName: 'Aidan Naidoo',
        email: 'aidannaidoo@gmail.com',
        password: 'Password202',
        gender: 'Male',
        dateOfBirth: '1994-04-18',
        age: 29,
        continent: 'Africa',
        country: 'South Africa',
        state: 'KwaZulu-Natal',
        city: 'Durban',
        address: 'Road 10, City 18',
        ethnicity: 'Indian',
        denomination: 'Hindu',
        education: "Bachelor's",
        maritalStatus: 'Single',
        hobby: ['Photography', 'Swimming'],
        occupation: 'Artist',
        interests: ['Art', 'Fitness'],
        aboutMe: 'I am an artist with a love for fitness.',
        role: 'user',
        isEmailVerified: true,
      },
      {
        fullName: 'Maximilian Fischer',
        email: 'maximilian.fischer@gmail.com',
        password: 'Password303',
        gender: 'Male',
        dateOfBirth: '1989-07-23',
        age: 34,
        continent: 'Europe',
        country: 'Germany',
        state: 'North Rhine-Westphalia',
        city: 'Cologne',
        address: 'Street 5, City 17',
        ethnicity: 'German',
        denomination: 'Atheist',
        education: "Master's",
        maritalStatus: 'Married',
        hobby: ['Cycling', 'Reading'],
        occupation: 'Consultant',
        interests: ['Business', 'Technology'],
        aboutMe: 'I am a business consultant who loves cycling.',
        role: 'user',
        isEmailVerified: true,
      },
      {
        fullName: 'Lindsay Louw',
        email: 'lindsaylouw@gmail.com',
        password: 'Password404',
        gender: 'Female',
        dateOfBirth: '1993-03-02',
        age: 30,
        continent: 'Africa',
        country: 'South Africa',
        state: 'Eastern Cape',
        city: 'Port Elizabeth',
        address: 'Street 8, City 22',
        ethnicity: 'Coloured',
        denomination: 'Christian',
        education: 'PhD',
        maritalStatus: 'Widowed',
        hobby: ['Gardening', 'Photography'],
        occupation: 'Photographer',
        interests: ['Nature', 'Art'],
        aboutMe: 'I am passionate about nature and photography.',
        role: 'user',
        isEmailVerified: true,
      },
      {
        fullName: 'Felix Weber',
        email: 'felix.weber@gmail.com',
        password: 'Password505',
        gender: 'Male',
        dateOfBirth: '1995-12-14',
        age: 28,
        continent: 'Europe',
        country: 'Germany',
        state: 'Hesse',
        city: 'Frankfurt',
        address: 'Main Street, City 22',
        ethnicity: 'German',
        denomination: 'Christian',
        education: 'High School',
        maritalStatus: 'Single',
        hobby: ['Traveling', 'Photography'],
        occupation: 'Photographer',
        interests: ['Art', 'Travel'],
        aboutMe: 'I am a photographer who loves to travel.',
        role: 'user',
        isEmailVerified: true,
      },
      {
        fullName: 'Isabella Kruger',
        email: 'isabellakruger@gmail.com',
        password: 'Password606',
        gender: 'Female',
        dateOfBirth: '1996-10-05',
        age: 27,
        continent: 'Africa',
        country: 'South Africa',
        state: 'Limpopo',
        city: 'Polokwane',
        address: 'Main Road, City 45',
        ethnicity: 'South African',
        denomination: 'Catholic',
        education: "Bachelor's",
        maritalStatus: 'Single',
        hobby: ['Yoga', 'Traveling'],
        occupation: 'Fitness Trainer',
        interests: ['Fitness', 'Travel'],
        aboutMe: 'I am a fitness trainer with a passion for travel.',
        role: 'user',
        isEmailVerified: true,
      },
    ];

    // Hash the password before saving users
    for (const user of usersData) {
      user.password = await hashPassword(user.password);
    }

    await User.deleteMany();
    await User.insertMany(usersData);
    console.log('Users seeded successfully!');
  } catch (err) {
    console.error('Error seeding users:', err);
  }
};

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    const dbUrl = process.env.MONGODB_URL;
    if (!dbUrl) throw new Error('MONGODB_URL not set in environment variables');

    await mongoose.connect(dbUrl);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // Exit process with failure
  }
};

// Main function to seed the database
const seedDatabase = async () => {
  try {
    await connectToDatabase();
    await dropDatabase();
    await seedUsers();
    console.log('--------------> Database seeding completed <--------------');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    mongoose.disconnect().then(() => console.log('Disconnected from MongoDB'));
  }
};

// Execute seeding
seedDatabase();
