"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Slot_1 = require("../models/Slot");
const Booking_1 = require("../models/Booking");
const stripe_1 = __importDefault(require("../services/stripe")); // Import the configured stripe instance
const router = express_1.default.Router();
const const_1 = require("../const");
const email_1 = require("../services/email");
const Member_1 = __importDefault(require("../models/Member"));
router.post('/create-checkout-session', async (req, res) => {
    const { bookingId } = req.body;
    try {
        const booking = await Booking_1.Booking.findById(bookingId);
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        console.log(JSON.stringify(booking, null, 2));
        console.log("payment amount", booking.payment?.amount);
        console.log("slots length", booking.slots.length);
        console.log("hourly price", const_1.HOURLY_PRICE_IN_SEK);
        console.log("payment amount * hourly price", booking.payment ? booking.payment.amount * const_1.HOURLY_PRICE_IN_SEK : 0);
        console.log("slots length * hourly price", booking.slots.length * const_1.HOURLY_PRICE_IN_SEK);
        const session = await stripe_1.default.checkout.sessions.create({
            ui_mode: 'embedded',
            line_items: [{
                    price_data: {
                        currency: 'sek',
                        product_data: {
                            name: `Tennis Court Booking (${booking.slots.length} hours)`,
                        },
                        unit_amount: const_1.HOURLY_PRICE_IN_SEK * 100,
                    },
                    quantity: booking.slots.length,
                }],
            mode: 'payment',
            // Use CLIENT_URL from environment variables
            return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/return?session_id={CHECKOUT_SESSION_ID}`,
            metadata: {
                bookingId: bookingId.toString()
            }
        });
        res.json({ clientSecret: session.client_secret });
    }
    catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({ error: 'Error creating checkout session' });
    }
});
// Add session status endpoint
router.get('/session-status', async (req, res) => {
    const { session_id } = req.query;
    try {
        const session = await stripe_1.default.checkout.sessions.retrieve(session_id, {
            expand: ['payment_intent']
        });
        res.json({
            status: session.status,
            customer_email: session.customer_details?.email,
            paymentId: session.payment_intent,
            bookingId: session.metadata?.bookingId
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error retrieving session status' });
    }
});
// Add new routes for payment updates
router.put('/:id/complete', async (req, res) => {
    const { paymentId, language = 'sv' } = req.body;
    try {
        const booking = await Booking_1.Booking.findByIdAndUpdate(req.params.id, {
            'payment.status': 'completed',
            'payment.paymentId': paymentId,
            'payment.method': 'stripe'
        }, { new: true }).populate('slots');
        if (!booking)
            return res.status(404).json({ message: 'Booking not found' });
        await Slot_1.Slot.updateMany({ booking: booking._id }, { $set: { status: 'booked' } });
        // Only send confirmation if we have valid booking data
        if (booking.user && booking.user.name && booking.user.email && booking.payment) {
            // Prepare booking data for email
            const emailData = {
                bookingId: booking._id.toString(),
                userName: booking.user.name,
                userEmail: booking.user.email,
                date: booking.date,
                slots: booking.slots.map((slot) => ({
                    start: slot.start,
                    end: slot.end,
                    courtNumber: slot.courtNumber
                })),
                payment: {
                    status: booking.payment.status,
                    amount: booking.payment.amount,
                    method: booking.payment.method || undefined,
                    paymentId: booking.payment.paymentId || undefined
                },
                cancellationToken: booking.cancellationToken,
                language
            };
            await (0, email_1.sendBookingConfirmation)(emailData);
        }
        else {
            console.error('Missing required booking data for email confirmation');
        }
        res.json({
            message: 'Booking payment completed',
            booking
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating booking' });
    }
});
// Release a pending booking when checkout is abandoned
router.post('/release-pending-booking', async (req, res) => {
    const { bookingId } = req.body;
    try {
        if (!bookingId) {
            return res.status(400).json({ message: 'Missing booking ID' });
        }
        const booking = await Booking_1.Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        // Only release slots for pending bookings
        if (!booking.payment || booking.payment.status !== 'pending') {
            return res.status(400).json({
                message: 'Cannot release a booking that is not in pending status'
            });
        }
        // Update booking status to cancelled
        booking.payment.status = 'cancelled';
        await booking.save();
        // Release the slots by setting them back to available
        await Slot_1.Slot.updateMany({ _id: { $in: booking.slots } }, { $set: { status: 'available', booking: null } });
        // If this was a member booking with used slots, restore them
        if (booking.payment.method === 'free' && booking.user && booking.user.email) {
            const member = await Member_1.default.findOne({ email: booking.user.email });
            if (member) {
                const currentYear = new Date().getFullYear();
                // Use a more general type approach to avoid TypeScript errors
                const yearlySlot = member.yearlySlots.find((slot) => slot.year === currentYear);
                if (yearlySlot) {
                    // Remove the slot IDs from the usedSlots array
                    yearlySlot.usedSlots = yearlySlot.usedSlots.filter((slotId) => !booking.slots.some((bookingSlotId) => bookingSlotId.toString() === slotId.toString()));
                    await member.save();
                }
            }
        }
        res.json({ message: 'Booking cancelled and slots released successfully' });
    }
    catch (error) {
        console.error('Error releasing booking:', error);
        res.status(500).json({ message: 'Error releasing booking' });
    }
});
exports.default = router;
