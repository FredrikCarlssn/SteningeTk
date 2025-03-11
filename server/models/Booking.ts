import mongoose, { Schema } from 'mongoose';
import { HOURLY_PRICE_IN_SEK } from '../const';

export const SlotSchema = new Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  courtNumber: { type: Number, required: true, enum: [1, 2] },
  available: { type: Boolean, required: true, default: true },
});

const bookingSchema = new Schema({
  date: { type: Date, required: true },
  slots: [{
    type: Schema.Types.ObjectId,
    ref: 'Slot',
    required: true
  }],
  user: {
    name: { type: String, required: false },
    email: { type: String, required: false },
    phone: { type: String, required: false },
  },
  payment: {
    method: { type: String, required: false },
    amount: { 
      type: Number, 
      required: true, 
      default: function() {
        return HOURLY_PRICE_IN_SEK * (this as any).slots.length;
      }
    },
    status: { 
      type: String, 
      required: true, 
      enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded']
    },
    paymentId: { type: String, required: false },
  },
  createdAt: { type: Date, default: Date.now },
  cancellationToken: {
    type: String,
    required: true,
    unique: true
  },
});

bookingSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

bookingSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function(doc, ret) {
    delete ret._id;
  }
});

export const Booking = mongoose.model('Booking', bookingSchema);
