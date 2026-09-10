require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Expense = require('../models/Expense');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
};

const seedData = async () => {
  await connectDB();

  // Clean existing seed user
  const existing = await User.findOne({ email: 'demo@fincoach.ai' });
  if (existing) {
    await Expense.deleteMany({ user: existing._id });
    await User.deleteOne({ _id: existing._id });
  }

  // Create demo user
  const user = await User.create({
    name: 'Alex Johnson',
    email: 'demo@fincoach.ai',
    password: 'demo1234',
    currency: 'USD',
    monthlyBudget: 3500,
  });
  console.log(`👤 Demo user created: demo@fincoach.ai / demo1234`);

  // Generate 6 months of realistic expense data
  const categories = Expense.schema.path('category').enumValues;
  const expenses = [];
  const now = new Date();

  const categoryTemplates = {
    'Food & Dining': [
      { title: 'Grocery Store', min: 60, max: 180 },
      { title: 'Restaurant lunch', min: 12, max: 35 },
      { title: 'Coffee shop', min: 5, max: 12 },
      { title: 'Uber Eats delivery', min: 20, max: 55 },
      { title: 'Supermarket', min: 80, max: 200 },
    ],
    Transportation: [
      { title: 'Gas station', min: 40, max: 80 },
      { title: 'Uber ride', min: 12, max: 30 },
      { title: 'Monthly transit pass', min: 90, max: 120 },
      { title: 'Parking fee', min: 8, max: 25 },
    ],
    'Housing & Utilities': [
      { title: 'Rent payment', min: 1200, max: 1200 },
      { title: 'Electric bill', min: 70, max: 140 },
      { title: 'Internet service', min: 60, max: 80 },
      { title: 'Water bill', min: 35, max: 60 },
    ],
    Entertainment: [
      { title: 'Netflix subscription', min: 15, max: 20 },
      { title: 'Spotify Premium', min: 10, max: 10 },
      { title: 'Movie tickets', min: 15, max: 35 },
      { title: 'Video game', min: 20, max: 70 },
      { title: 'Concert ticket', min: 40, max: 120 },
    ],
    Shopping: [
      { title: 'Amazon purchase', min: 20, max: 120 },
      { title: 'Clothing store', min: 30, max: 150 },
      { title: 'Electronics', min: 50, max: 300 },
      { title: 'Home goods', min: 25, max: 80 },
    ],
    Healthcare: [
      { title: 'Pharmacy', min: 15, max: 60 },
      { title: "Doctor's visit copay", min: 25, max: 50 },
      { title: 'Gym membership', min: 30, max: 60 },
      { title: 'Dental checkup', min: 50, max: 200 },
    ],
    Education: [
      { title: 'Online course', min: 20, max: 100 },
      { title: 'Books', min: 15, max: 50 },
      { title: 'Udemy subscription', min: 12, max: 30 },
    ],
    'Personal Care': [
      { title: 'Haircut', min: 20, max: 60 },
      { title: 'Skincare products', min: 15, max: 80 },
      { title: 'Barbershop', min: 25, max: 40 },
    ],
    'Savings & Investment': [
      { title: 'Emergency fund transfer', min: 100, max: 300 },
      { title: 'Stock purchase', min: 50, max: 200 },
    ],
    Travel: [
      { title: 'Flight booking', min: 150, max: 500 },
      { title: 'Hotel stay', min: 80, max: 200 },
      { title: 'Airbnb', min: 100, max: 350 },
    ],
  };

  for (let month = 5; month >= 0; month--) {
    const numExpenses = Math.floor(Math.random() * 20) + 25; // 25–45 per month
    for (let i = 0; i < numExpenses; i++) {
      const category = categories[Math.floor(Math.random() * (categories.length - 1))];
      const templates = categoryTemplates[category];
      if (!templates) continue;
      const template = templates[Math.floor(Math.random() * templates.length)];
      const amount = parseFloat(
        (Math.random() * (template.max - template.min) + template.min).toFixed(2)
      );
      const day = Math.floor(Math.random() * 28) + 1;
      const date = new Date(now.getFullYear(), now.getMonth() - month, day);

      expenses.push({
        user: user._id,
        title: template.title,
        amount,
        category,
        date,
        notes: Math.random() > 0.7 ? 'Regular expense' : undefined,
        isRecurring:
          template.title.includes('subscription') ||
          template.title.includes('membership') ||
          template.title.includes('Rent'),
      });
    }
  }

  await Expense.insertMany(expenses);
  console.log(`💰 ${expenses.length} expenses seeded across 6 months`);
  console.log('\n✅ Seed complete! Login with: demo@fincoach.ai / demo1234');
  process.exit(0);
};

seedData().catch((err) => {
  console.error(err);
  process.exit(1);
});
