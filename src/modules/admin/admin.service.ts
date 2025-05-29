import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { User } from '../user/user.model';

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ✅ Get Total Users & Earnings for Admin Dashboard
const getDashboardData = async () => {
  const totalUsers = await User.countDocuments({
    role: 'user',
    isEmailVerified: true,
  });


  const totalTodayUsers = await User.countDocuments({
    role: 'user',
    createdAt: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lte: new Date(new Date().setHours(23, 59, 59, 999)),
    },
  });

  const dailyPremiumUsers = await User.countDocuments({
    role: 'user',
    isPremiumUser: true,
    updatedAt: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lte: new Date(new Date().setHours(23, 59, 59, 999)),
    },
  });


  return {
    totalUsers,
    totalTodayUsers,
    dailyPremiumUsers,
  };
};

// ✅ User Activity and Match Success Rate Graph Chart
const userActivityGraphChart = async (
  period: 'weekly' | 'monthly' | 'yearly'
) => {
  let userActivityData: { name: string; users: number }[] = [];
  let startDate: Date;
  let endDate: Date = new Date();

  // Get the current year
  const currentYear = new Date().getFullYear();

  // Determine the time range based on the period
  if (period === 'weekly') {
    // Last 7 days (days of the week)
    startDate = new Date(new Date().setDate(new Date().getDate() - 6));
    userActivityData = dayNames.map(day => ({ name: day, users: 0 }));
  } else if (period === 'monthly') {
    // Last month, grouped by week
    startDate = new Date(new Date().setDate(new Date().getDate() - 29));
    userActivityData = [
      { name: 'Week 1', users: 0 },
      { name: 'Week 2', users: 0 },
      { name: 'Week 3', users: 0 },
      { name: 'Week 4', users: 0 },
      { name: 'Week 5', users: 0 },
    ];
  } else if (period === 'yearly') {
    // Current year, grouped by month
    startDate = new Date(`${currentYear}-01-01`); // January 1st of the current year
    endDate = new Date(`${currentYear}-12-31`); // December 31st of the current year
    userActivityData = monthNames.map(month => ({ name: month, users: 0 }));
  } else {
    throw new Error('Invalid period. Use "weekly", "monthly", or "yearly".');
  }

  // ✅ Fetch User Activity (based on `createdAt` for new users)
  const userActivity = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        role: 'user',
        isEmailVerified: true,
      },
    },
    {
      $group: {
        _id:
          period === 'weekly'
            ? { $dayOfWeek: '$createdAt' }
            : period === 'monthly'
            ? {
                $subtract: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          { $dayOfYear: '$createdAt' },
                          { $dayOfYear: startDate },
                        ],
                      },
                      6,
                    ],
                  },
                  {
                    $mod: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              { $dayOfYear: '$createdAt' },
                              { $dayOfYear: startDate },
                            ],
                          },
                          6,
                        ],
                      },
                      1,
                    ],
                  },
                ],
              } // Group by week of the month
            : { $month: '$createdAt' }, // Group by month of the year
        activity: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ✅ Populate User Activity Data based on period
  userActivity.forEach((entry: any) => {
    if (period === 'weekly') {
      // Ensure entry._id corresponds to valid day of the week (0 = Sunday, 6 = Saturday)
      const dayIndex = (entry._id + 6) % 7; // Adjust to start from Sunday (0)
      if (userActivityData[dayIndex]) {
        userActivityData[dayIndex].users = entry.activity;
      }
    } else if (period === 'monthly') {
      // Ensure entry._id corresponds to valid week index (1-based week)
      const weekIndex = entry._id - 1; // Adjust for zero-indexed week
      if (userActivityData[weekIndex]) {
        userActivityData[weekIndex].users = entry.activity;
      }
    } else if (period === 'yearly') {
      // Ensure entry._id corresponds to valid month index (1-based month)
      const monthIndex = entry._id - 1; // Adjust for zero-indexed month
      if (userActivityData[monthIndex]) {
        userActivityData[monthIndex].users = entry.activity;
      }
    }
  });

  return { userActivity: userActivityData,period };
};


export const AdminServices = {
  getDashboardData,
  userActivityGraphChart
};
