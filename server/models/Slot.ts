import mongoose, { Schema } from 'mongoose';

const slotSchema = new Schema({
  start: { type: Date, required: true, index: true },
  end: { type: Date, required: true, index: true },
  courtNumber: { type: Number, required: true, enum: [1, 2], index: true },
  booking: { 
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: false // Available slots won't have a booking reference
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'booked', 'pending'],
    default: 'available'
  }
});

slotSchema.index({ courtNumber: 1, start: 1, end: 1 }, { unique: true });

export const Slot = mongoose.model('Slot', slotSchema); 