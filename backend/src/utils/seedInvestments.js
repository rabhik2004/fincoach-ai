require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Investment = require('../models/Investment');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
};

const SAMPLE_INVESTMENTS = [
  // Stocks
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', type: 'Stock', sector: 'Energy', quantity: 10, avgBuyPrice: 2350, currentPrice: 2720, exchange: 'NSE', currency: 'INR', goal: 'Wealth Building' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', type: 'Stock', sector: 'Technology', quantity: 5, avgBuyPrice: 3400, currentPrice: 3850, exchange: 'NSE', currency: 'INR', goal: 'Wealth Building' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', type: 'Stock', sector: 'Finance', quantity: 20, avgBuyPrice: 1580, currentPrice: 1640, exchange: 'NSE', currency: 'INR', goal: 'Wealth Building' },
  { symbol: 'INFY', name: 'Infosys Ltd', type: 'Stock', sector: 'Technology', quantity: 15, avgBuyPrice: 1450, currentPrice: 1390, exchange: 'NSE', currency: 'INR', goal: 'Wealth Building' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', type: 'Stock', sector: 'Technology', quantity: 30, avgBuyPrice: 480, currentPrice: 520, exchange: 'NSE', currency: 'INR', goal: 'Wealth Building' },
  // Mutual Funds
  { symbol: 'AXIS-BLUECHIP', name: 'Axis Bluechip Fund Direct Growth', type: 'Mutual Fund', sector: 'Diversified', quantity: 250.845, avgBuyPrice: 42.5, currentPrice: 55.8, currency: 'INR', isSIP: true, sipAmount: 5000, sipDate: 5, goal: 'Retirement' },
  { symbol: 'MIRAE-EMERG', name: 'Mirae Asset Emerging Bluechip', type: 'Mutual Fund', sector: 'Diversified', quantity: 180.23, avgBuyPrice: 78.2, currentPrice: 98.5, currency: 'INR', isSIP: true, sipAmount: 3000, sipDate: 1, goal: 'Wealth Building' },
  { symbol: 'PPFAS-FLEX', name: 'Parag Parikh Flexi Cap Fund', type: 'Mutual Fund', sector: 'Diversified', quantity: 95.6, avgBuyPrice: 52.8, currentPrice: 72.4, currency: 'INR', isSIP: false, goal: 'Retirement' },
  // ETFs
  { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', type: 'ETF', sector: 'Commodities', quantity: 50, avgBuyPrice: 48.5, currentPrice: 56.2, exchange: 'NSE', currency: 'INR', goal: 'Emergency Fund' },
  { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty BeES', type: 'ETF', sector: 'Diversified', quantity: 100, avgBuyPrice: 210, currentPrice: 248, exchange: 'NSE', currency: 'INR', goal: 'Wealth Building' },
  // Crypto
  { symbol: 'BTC', name: 'Bitcoin', type: 'Crypto', sector: 'Crypto', quantity: 0.05, avgBuyPrice: 2800000, currentPrice: 5200000, currency: 'INR', goal: 'Wealth Building' },
  { symbol: 'ETH', name: 'Ethereum', type: 'Crypto', sector: 'Crypto', quantity: 0.8, avgBuyPrice: 180000, currentPrice: 240000, currency: 'INR', goal: 'Wealth Building' },
  // Gold
  { name: 'Sovereign Gold Bond 2023', type: 'Gold', sector: 'Commodities', quantity: 10, avgBuyPrice: 5800, currentPrice: 6420, currency: 'INR', goal: 'Emergency Fund' },
];

const seedInvestments = async () => {
  await connectDB();
  const user = await User.findOne({ email: 'demo@fincoach.ai' });
  if (!user) {
    console.error('❌ Demo user not found. Run npm run seed first.');
    process.exit(1);
  }
  await Investment.deleteMany({ user: user._id });
  const investments = SAMPLE_INVESTMENTS.map((inv) => ({ ...inv, user: user._id }));
  await Investment.insertMany(investments);
  console.log(`📈 ${investments.length} investments seeded for demo@fincoach.ai`);
  const totalInvested = investments.reduce((s, i) => s + i.quantity * i.avgBuyPrice, 0);
  const currentValue = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  console.log(`   Total invested: ₹${totalInvested.toLocaleString()}`);
  console.log(`   Current value:  ₹${currentValue.toLocaleString()}`);
  console.log(`   Return: +₹${(currentValue - totalInvested).toLocaleString()} (+${(((currentValue - totalInvested) / totalInvested) * 100).toFixed(1)}%)`);
  process.exit(0);
};

seedInvestments().catch((err) => { console.error(err); process.exit(1); });
