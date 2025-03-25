import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  yearlySlots: [{
    year: Number,
    usedSlots: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot'
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Member', memberSchema);