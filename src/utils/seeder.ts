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
        fullName: 'John Smith',
        username: 'johnsmith21',
        email: 'john.smith21@example.com',
        phoneNumber: '+12025550123',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 40.7128,
          longitude: -74.006,
        },
        locationName: 'New York, NY',
        address: '123 Main St, New York, NY 10001',
        gender: 'Male',
        maritalStatus: 'Single',
        description: 'Software developer with a passion for coding.',
        role: 'User',
        profession: 'Software Engineer',
        ageRange: '25-34',
        country: 'USA',
        city: 'New York',
        state: 'NY',
        referredAs: 'John',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Emma Johnson',
        username: 'emmajohnson22',
        email: 'emma.johnson22@example.com',
        phoneNumber: '+12025550124',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 34.0522,
          longitude: -118.2437,
        },
        locationName: 'Los Angeles, CA',
        address: '456 Oak Ave, Los Angeles, CA 90001',
        gender: 'Female',
        maritalStatus: 'Married',
        description: 'Graphic designer and coffee enthusiast.',
        role: 'User',
        profession: 'Graphic Designer',
        ageRange: '18-24',
        country: 'USA',
        city: 'Los Angeles',
        state: 'CA',
        referredAs: 'Emma',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Michael Brown',
        username: 'michaelbrown23',
        email: 'michael.brown23@example.com',
        phoneNumber: '+12025550125',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 41.8781,
          longitude: -87.6298,
        },
        locationName: 'Chicago, IL',
        address: '789 Pine St, Chicago, IL 60601',
        gender: 'Male',
        maritalStatus: 'Single',
        description: 'Data analyst with a love for hiking.',
        role: 'User',
        profession: 'Data Analyst',
        ageRange: '35-44',
        country: 'USA',
        city: 'Chicago',
        state: 'IL',
        referredAs: 'Mike',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Sarah Davis',
        username: 'sarahdavis24',
        email: 'sarah.davis24@example.com',
        phoneNumber: '+12025550126',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 29.7604,
          longitude: -95.3698,
        },
        locationName: 'Houston, TX',
        address: '101 Elm St, Houston, TX 77001',
        gender: 'Female',
        maritalStatus: 'Divorced',
        description: 'Marketing specialist and yoga lover.',
        role: 'User',
        profession: 'Marketing Specialist',
        ageRange: '25-34',
        country: 'USA',
        city: 'Houston',
        state: 'TX',
        referredAs: 'Sarah',
        isEmailVerified: true,
       
      },
      {
        fullName: 'David Wilson',
        username: 'davidwilson25',
        email: 'david.wilson25@example.com',
        phoneNumber: '+12025550127',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 39.9526,
          longitude: -75.1652,
        },
        locationName: 'Philadelphia, PA',
        address: '202 Cedar St, Philadelphia, PA 19101',
        gender: 'Male',
        maritalStatus: 'Single',
        description: 'Freelance writer and avid reader.',
        role: 'User',
        profession: 'Writer',
        ageRange: '18-24',
        country: 'USA',
        city: 'Philadelphia',
        state: 'PA',
        referredAs: 'Dave',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Laura Martinez',
        username: 'lauramartinez26',
        email: 'laura.martinez26@example.com',
        phoneNumber: '+12025550128',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 25.7617,
          longitude: -80.1918,
        },
        locationName: 'Miami, FL',
        address: '303 Birch St, Miami, FL 33101',
        gender: 'Female',
        maritalStatus: 'Married',
        description: 'Event planner with a flair for creativity.',
        role: 'User',
        profession: 'Event Planner',
        ageRange: '25-34',
        country: 'USA',
        city: 'Miami',
        state: 'FL',
        referredAs: 'Laura',
        isEmailVerified: true,
       
      },
      {
        fullName: 'James Taylor',
        username: 'jamestaylor27',
        email: 'james.taylor27@example.com',
        phoneNumber: '+12025550129',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 47.6062,
          longitude: -122.3321,
        },
        locationName: 'Seattle, WA',
        address: '404 Maple St, Seattle, WA 98101',
        gender: 'Male',
        maritalStatus: 'Single',
        description: 'Tech enthusiast and startup founder.',
        role: 'User',
        profession: 'Entrepreneur',
        ageRange: '35-44',
        country: 'USA',
        city: 'Seattle',
        state: 'WA',
        referredAs: 'James',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Emily Clark',
        username: 'emilyclark28',
        email: 'emily.clark28@example.com',
        phoneNumber: '+12025550130',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        locationName: 'San Francisco, CA',
        address: '505 Spruce St, San Francisco, CA 94101',
        gender: 'Female',
        maritalStatus: 'Single',
        description: 'UX designer passionate about user experiences.',
        role: 'User',
        profession: 'UX Designer',
        ageRange: '18-24',
        country: 'USA',
        city: 'San Francisco',
        state: 'CA',
        referredAs: 'Emily',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Robert Lee',
        username: 'robertlee29',
        email: 'robert.lee29@example.com',
        phoneNumber: '+12025550131',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 42.3601,
          longitude: -71.0589,
        },
        locationName: 'Boston, MA',
        address: '606 Walnut St, Boston, MA 02101',
        gender: 'Male',
        maritalStatus: 'Married',
        description: 'Professor of history and book lover.',
        role: 'User',
        profession: 'Professor',
        ageRange: '45-54',
        country: 'USA',
        city: 'Boston',
        state: 'MA',
        referredAs: 'Rob',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Olivia Harris',
        username: 'oliviaharris30',
        email: 'olivia.harris30@example.com',
        phoneNumber: '+12025550132',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 33.749,
          longitude: -84.388,
        },
        locationName: 'Atlanta, GA',
        address: '707 Chestnut St, Atlanta, GA 30301',
        gender: 'Female',
        maritalStatus: 'Single',
        description: 'Social media manager and travel enthusiast.',
        role: 'User',
        profession: 'Social Media Manager',
        ageRange: '25-34',
        country: 'USA',
        city: 'Atlanta',
        state: 'GA',
        referredAs: 'Olivia',
        isEmailVerified: true,
       
      },
      {
        fullName: 'William Walker',
        username: 'williamwalker31',
        email: 'william.walker31@example.com',
        phoneNumber: '+12025550133',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 39.7392,
          longitude: -104.9903,
        },
        locationName: 'Denver, CO',
        address: '808 Pine St, Denver, CO 80201',
        gender: 'Male',
        maritalStatus: 'Divorced',
        description: 'Architect with a passion for sustainable design.',
        role: 'User',
        profession: 'Architect',
        ageRange: '35-44',
        country: 'USA',
        city: 'Denver',
        state: 'CO',
        referredAs: 'Will',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Sophia Lewis',
        username: 'sophialewis32',
        email: 'sophia.lewis32@example.com',
        phoneNumber: '+12025550134',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 35.6762,
          longitude: 139.6503,
        },
        locationName: 'Tokyo, Japan',
        address: '1-2-3 Shibuya, Tokyo, Japan',
        gender: 'Female',
        maritalStatus: 'Single',
        description: 'Photographer capturing moments worldwide.',
        role: 'User',
        profession: 'Photographer',
        ageRange: '18-24',
        country: 'Japan',
        city: 'Tokyo',
        referredAs: 'Sophia',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Liam Young',
        username: 'liamyoung33',
        email: 'liam.young33@example.com',
        phoneNumber: '+12025550135',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
        locationName: 'London, UK',
        address: '123 Baker St, London, UK',
        gender: 'Male',
        maritalStatus: 'Single',
        description: 'Musician and songwriter.',
        role: 'User',
        profession: 'Musician',
        ageRange: '25-34',
        country: 'UK',
        city: 'London',
        referredAs: 'Liam',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Ava King',
        username: 'avaking34',
        email: 'ava.king34@example.com',
        phoneNumber: '+12025550136',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: -33.8688,
          longitude: 151.2093,
        },
        locationName: 'Sydney, Australia',
        address: '456 George St, Sydney, Australia',
        gender: 'Female',
        maritalStatus: 'Married',
        description: 'Environmental scientist and nature lover.',
        role: 'User',
        profession: 'Environmental Scientist',
        ageRange: '35-44',
        country: 'Australia',
        city: 'Sydney',
        state: 'NSW',
        referredAs: 'Ava',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Noah Scott',
        username: 'noahscott35',
        email: 'noah.scott35@example.com',
        phoneNumber: '+12025550137',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 48.8566,
          longitude: 2.3522,
        },
        locationName: 'Paris, France',
        address: '789 Champs-Élysées, Paris, France',
        gender: 'Male',
        maritalStatus: 'Single',
        description: 'Chef with a passion for French cuisine.',
        role: 'User',
        profession: 'Chef',
        ageRange: '25-34',
        country: 'France',
        city: 'Paris',
        referredAs: 'Noah',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Mia Turner',
        username: 'miaturner36',
        email: 'mia.turner36@example.com',
        phoneNumber: '+12025550138',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 43.6532,
          longitude: -79.3832,
        },
        locationName: 'Toronto, Canada',
        address: '101 Queen St, Toronto, Canada',
        gender: 'Female',
        maritalStatus: 'Single',
        description: 'Journalist covering global events.',
        role: 'User',
        profession: 'Journalist',
        ageRange: '18-24',
        country: 'Canada',
        city: 'Toronto',
        state: 'ON',
        referredAs: 'Mia',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Ethan Adams',
        username: 'ethanadams37',
        email: 'ethan.adams37@example.com',
        phoneNumber: '+12025550139',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 40.4168,
          longitude: -3.7038,
        },
        locationName: 'Madrid, Spain',
        address: '202 Gran Vía, Madrid, Spain',
        gender: 'Male',
        maritalStatus: 'Married',
        description: 'Artist and illustrator.',
        role: 'User',
        profession: 'Artist',
        ageRange: '35-44',
        country: 'Spain',
        city: 'Madrid',
        referredAs: 'Ethan',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Isabella Green',
        username: 'isabellagreen38',
        email: 'isabella.green38@example.com',
        phoneNumber: '+12025550140',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 52.52,
          longitude: 13.405,
        },
        locationName: 'Berlin, Germany',
        address: '303 Unter den Linden, Berlin, Germany',
        gender: 'Female',
        maritalStatus: 'Single',
        description: 'Software developer and tech enthusiast.',
        role: 'User',
        profession: 'Software Developer',
        ageRange: '25-34',
        country: 'Germany',
        city: 'Berlin',
        referredAs: 'Isabella',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Lucas Baker',
        username: 'lucasbaker39',
        email: 'lucas.baker39@example.com',
        phoneNumber: '+12025550141',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 22.3193,
          longitude: 114.1694,
        },
        locationName: 'Hong Kong',
        address: '404 Nathan Rd, Hong Kong',
        gender: 'Male',
        maritalStatus: 'Single',
        description: 'Financial analyst and coffee lover.',
        role: 'User',
        profession: 'Financial Analyst',
        ageRange: '25-34',
        country: 'Hong Kong',
        city: 'Hong Kong',
        referredAs: 'Lucas',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Charlotte Wright',
        username: 'charlottewright40',
        email: 'charlotte.wright40@example.com',
        phoneNumber: '+12025550142',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: -23.5505,
          longitude: -46.6333,
        },
        locationName: 'São Paulo, Brazil',
        address: '505 Paulista Ave, São Paulo, Brazil',
        gender: 'Female',
        maritalStatus: 'Married',
        description: 'Teacher and education advocate.',
        role: 'User',
        profession: 'Teacher',
        ageRange: '35-44',
        country: 'Brazil',
        city: 'São Paulo',
        referredAs: 'Charlotte',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Benjamin Hill',
        username: 'benjaminhill41',
        email: 'benjamin.hill41@example.com',
        phoneNumber: '+12025550143',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 55.7558,
          longitude: 37.6173,
        },
        locationName: 'Moscow, Russia',
        address: '606 Tverskaya St, Moscow, Russia',
        gender: 'Male',
        maritalStatus: 'Single',
        description: 'Engineer with a passion for robotics.',
        role: 'User',
        profession: 'Engineer',
        ageRange: '25-34',
        country: 'Russia',
        city: 'Moscow',
        referredAs: 'Ben',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Amelia Allen',
        username: 'ameliaallen42',
        email: 'amelia.allen42@example.com',
        phoneNumber: '+12025550144',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 28.7041,
          longitude: 77.1025,
        },
        locationName: 'Delhi, India',
        address: '707 Connaught Place, Delhi, India',
        gender: 'Female',
        maritalStatus: 'Single',
        description: 'Content creator and foodie.',
        role: 'User',
        profession: 'Content Creator',
        ageRange: '18-24',
        country: 'India',
        city: 'Delhi',
        referredAs: 'Amelia',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Henry Nelson',
        username: 'henrynelson43',
        email: 'henry.nelson43@example.com',
        phoneNumber: '+12025550145',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 19.4326,
          longitude: -99.1332,
        },
        locationName: 'Mexico City, Mexico',
        address: '808 Reforma Ave, Mexico City, Mexico',
        gender: 'Male',
        maritalStatus: 'Married',
        description: 'Doctor specializing in cardiology.',
        role: 'User',
        profession: 'Doctor',
        ageRange: '45-54',
        country: 'Mexico',
        city: 'Mexico City',
        referredAs: 'Henry',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Evelyn Carter',
        username: 'evelyncarter44',
        email: 'evelyn.carter44@example.com',
        phoneNumber: '+12025550146',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: 1.3521,
          longitude: 103.8198,
        },
        locationName: 'Singapore',
        address: '909 Orchard Rd, Singapore',
        gender: 'Female',
        maritalStatus: 'Single',
        description: 'Entrepreneur in the tech industry.',
        role: 'User',
        profession: 'Entrepreneur',
        ageRange: '25-34',
        country: 'Singapore',
        city: 'Singapore',
        referredAs: 'Evelyn',
        isEmailVerified: true,
       
      },
      {
        fullName: 'Alexander Perez',
        username: 'alexanderperez45',
        email: 'alexander.perez45@example.com',
        phoneNumber: '+12025550147',
        password: 'Password123',
        status: 'Active',
        location: {
          latitude: -33.4489,
          longitude: -70.6693,
        },
        locationName: 'Santiago, Chile',
        address: '101 Providencia, Santiago, Chile',
        gender: 'Male',
        maritalStatus: 'Single',
        description: 'Fitness coach and motivational speaker.',
        role: 'User',
        profession: 'Fitness Coach',
        ageRange: '25-34',
        country: 'Chile',
        city: 'Santiago',
        referredAs: 'Alex',
        isEmailVerified: true,
       
      },
    ];

    // Hash the password before saving users
    for (const user of usersData) {
      user.password = await hashPassword(user.password);
    }

    await User.deleteMany({});
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