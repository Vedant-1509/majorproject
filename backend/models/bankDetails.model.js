const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGO',
    required: true,
    unique: true
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true,
    minlength: 9,
    maxlength: 18
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    match: /^[A-Z]{4}0[A-Z0-9]{6}$/
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  branchName: {
    type: String,
    trim: true,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  razorpayContactId: {
    type: String,
    sparse: true
  },
  razorpayFundAccountId: {
    type: String,
    sparse: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
bankDetailsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
bankDetailsSchema.index({ ngoId: 1 });

module.exports = mongoose.model('BankDetails', bankDetailsSchema);