const mongoose = require('mongoose');

const ASSET_TYPES = [
  'Stock',
  'Mutual Fund',
  'ETF',
  'Crypto',
  'Gold',
  'Bond',
  'Real Estate',
  'Other',
];

const SECTORS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Consumer Goods',
  'Energy',
  'Utilities',
  'Industrials',
  'Materials',
  'Real Estate',
  'Communication',
  'Crypto',
  'Commodities',
  'Diversified',
  'Other',
];

const priceHistorySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  price: { type: Number, required: true },
});

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['buy', 'sell'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  notes: { type: String, trim: true, maxlength: 200 },
});

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Core identification
    symbol: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    name: {
      type: String,
      required: [true, 'Investment name is required'],
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      required: [true, 'Asset type is required'],
      enum: ASSET_TYPES,
    },
    sector: {
      type: String,
      enum: SECTORS,
      default: 'Other',
    },

    // Position data
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    avgBuyPrice: {
      type: Number,
      required: [true, 'Average buy price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
      min: [0, 'Price cannot be negative'],
    },

    // Optional metadata
    exchange: { type: String, trim: true, maxlength: 20 },
    currency: { type: String, default: 'INR', maxlength: 5 },
    isSIP: { type: Boolean, default: false },
    sipAmount: { type: Number, default: 0 },
    sipDate: { type: Number, min: 1, max: 31 },
    notes: { type: String, trim: true, maxlength: 300 },

    // Goal tagging
    goal: {
      type: String,
      enum: ['Retirement', 'Emergency Fund', 'Home Purchase', 'Education', 'Wealth Building', 'Other', null],
      default: null,
    },

    // Transaction history (optional detailed tracking)
    transactions: [transactionSchema],

    // Price history (last 30 data points for sparkline)
    priceHistory: [priceHistorySchema],
  },
  { timestamps: true }
);

// ─── Virtual fields ────────────────────────────────────────────────────────
investmentSchema.virtual('investedAmount').get(function () {
  return parseFloat((this.quantity * this.avgBuyPrice).toFixed(2));
});

investmentSchema.virtual('currentValue').get(function () {
  return parseFloat((this.quantity * this.currentPrice).toFixed(2));
});

investmentSchema.virtual('absoluteReturn').get(function () {
  return parseFloat((this.currentValue - this.investedAmount).toFixed(2));
});

investmentSchema.virtual('percentReturn').get(function () {
  if (!this.investedAmount) return 0;
  return parseFloat((((this.currentValue - this.investedAmount) / this.investedAmount) * 100).toFixed(2));
});

investmentSchema.set('toJSON', { virtuals: true });
investmentSchema.set('toObject', { virtuals: true });

// Indexes
investmentSchema.index({ user: 1, type: 1 });
investmentSchema.index({ user: 1, symbol: 1 });

investmentSchema.statics.ASSET_TYPES = ASSET_TYPES;
investmentSchema.statics.SECTORS = SECTORS;

module.exports = mongoose.model('Investment', investmentSchema);
