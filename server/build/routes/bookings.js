"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Booking_1 = require("../models/Booking");
const date_fns_1 = require("date-fns");
const const_1 = require("../const");
const Slot_1 = require("../models/Slot");
const crypto_1 = __importDefault(require("crypto"));
const Member_1 = __importDefault(require("../models/Member"));
const stripe_1 = __importDefault(require("../services/stripe"));
const email_1 = require("../services/email");
const router = express_1.default.Router();
// Get available time slots
router.get('/availability', async (req, res) => {
    const { date, courtNumber } = req.query;
    const localDate = new Date(date);
    localDate.setHours(0, 0, 0, 0);
    // Get all possible slots
    const allSlots = generateTimeSlots(localDate, parseInt(courtNumber, 10));
    // Find existing slots with any status
    const existingSlots = await Slot_1.Slot.find({
        courtNumber: parseInt(courtNumber, 10),
        start: { $gte: localDate },
        end: { $lte: (0, date_fns_1.endOfDay)(localDate) }
    });
    // Mark availability
    const slotsWithAvailability = allSlots.map(slot => {
        // Find matching existing slot if any
        const existingSlot = existingSlots.find(existing => existing.start.getTime() === slot.start.getTime() &&
            existing.end.getTime() === slot.end.getTime());
        return {
            start: slot.start,
            end: slot.end,
            courtNumber: parseInt(courtNumber, 10),
            // A slot is available if no existing slot or the existing slot has 'available' status
            available: !existingSlot || existingSlot.status === 'available',
            status: existingSlot ? existingSlot.status : 'available'
        };
    });
    res.json(slotsWithAvailability);
});
// Helper function to generate time slots
function generateTimeSlots(date, courtNumber) {
    const slots = [];
    const start = new Date(date);
    start.setHours(6, 0, 0, 0); // Courts open at 8am local time
    const end = new Date(date);
    end.setHours(20, 0, 0, 0); // Courts close at 10pm local time
    while (start < end) {
        const slotEnd = new Date(start.getTime() + 60 * 60000); // 60-minute slots
        slots.push({
            start: new Date(start),
            end: new Date(slotEnd)
        });
        start.setTime(slotEnd.getTime());
    }
    return slots;
}
// Add this after the availability route
router.post('/', async (req, res) => {
    try {
        const { slots: selectedSlots, user, isUnder20, language = 'sv' } = req.body;
        // Check if any selected slots are in the past
        const now = new Date().getTime();
        const hasPastSlots = selectedSlots.some((slot) => {
            const slotStartTime = new Date(slot.start).getTime();
            return now >= slotStartTime;
        });
        if (hasPastSlots) {
            return res.status(400).json({
                message: 'Cannot book slots that have already started or passed'
            });
        }
        // Check if any of the selected slots are already booked or pending
        for (const slot of selectedSlots) {
            const existingBookedSlot = await Slot_1.Slot.findOne({
                start: new Date(slot.start),
                end: new Date(slot.end),
                courtNumber: slot.courtNumber,
                status: { $in: ['booked', 'pending'] }
            });
            if (existingBookedSlot) {
                return res.status(400).json({
                    message: 'One or more selected slots are already booked'
                });
            }
        }
        // Find existing available slots or create new ones
        const slotDocuments = await Promise.all(selectedSlots.map(async (slot) => {
            // First check if the slot already exists but is available
            const existingSlot = await Slot_1.Slot.findOne({
                start: new Date(slot.start),
                end: new Date(slot.end),
                courtNumber: slot.courtNumber,
                status: 'available'
            });
            if (existingSlot) {
                // Use the existing slot
                existingSlot.status = 'pending';
                return await existingSlot.save();
            }
            else {
                // Create a new slot if none exists
                const newSlot = new Slot_1.Slot({
                    start: slot.start,
                    end: slot.end,
                    courtNumber: slot.courtNumber,
                    status: 'pending'
                });
                return await newSlot.save();
            }
        }));
        // Check member status and remaining slots
        const currentYear = new Date().getFullYear();
        const member = await Member_1.default.findOne({ email: user.email });
        let slotsRemaining = 0;
        if (member) {
            const yearlySlot = member.yearlySlots.find(year => year.year === currentYear);
            if (!yearlySlot) {
                member.yearlySlots.push({ year: currentYear, usedSlots: [] });
                await member.save();
                const newYearlySlot = member.yearlySlots.find(year => year.year === currentYear);
                if (newYearlySlot) {
                    slotsRemaining = 10 - newYearlySlot.usedSlots.length;
                }
            }
            else {
                slotsRemaining = 10 - yearlySlot.usedSlots.length;
            }
        }
        const freeSlots = Math.min(slotDocuments.length, slotsRemaining);
        const paidSlots = slotDocuments.length - freeSlots;
        // Create booking
        const newBooking = new Booking_1.Booking({
            date: new Date(selectedSlots[0].start),
            slots: slotDocuments.map(s => s._id),
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone
            },
            payment: {
                method: paidSlots === 0 ? 'free' : 'stripe', // Use 'free' only for actual free bookings
                amount: paidSlots * const_1.HOURLY_PRICE_IN_SEK,
                status: paidSlots === 0 ? 'completed' : 'pending'
            },
            cancellationToken: crypto_1.default.randomBytes(32).toString('hex'),
        });
        await newBooking.save();
        // Update member's used slots if they are a member and have available slots
        if (member && freeSlots > 0) {
            const yearlySlot = member.yearlySlots.find(year => year.year === currentYear);
            if (yearlySlot) {
                // Add slot IDs to the usedSlots array for the number of free slots
                const slotIdsToAdd = slotDocuments.slice(0, freeSlots).map(s => s._id);
                yearlySlot.usedSlots.push(...slotIdsToAdd);
                await member.save();
            }
        }
        // Update slots based on payment status
        const slotUpdate = {
            status: paidSlots === 0 ? 'booked' : 'pending',
            booking: newBooking._id
        };
        await Slot_1.Slot.updateMany({ _id: { $in: slotDocuments.map(s => s._id) } }, { $set: slotUpdate });
        // Send confirmation email for member bookings (free slots)
        if (paidSlots === 0 && newBooking.payment) {
            try {
                await (0, email_1.sendBookingConfirmation)({
                    bookingId: newBooking._id.toString(),
                    userName: user.name,
                    userEmail: user.email,
                    date: newBooking.date,
                    slots: slotDocuments.map(slot => ({
                        start: slot.start,
                        end: slot.end,
                        courtNumber: slot.courtNumber
                    })),
                    payment: {
                        status: newBooking.payment.status,
                        amount: newBooking.payment.amount,
                        method: newBooking.payment.method || undefined,
                        paymentId: newBooking.payment.paymentId || undefined
                    },
                    cancellationToken: newBooking.cancellationToken,
                    language: language
                });
            }
            catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
                // Don't throw the error, just log it
            }
        }
        res.status(201).json({
            message: `Booking created with ${slotDocuments.length} slot(s)`,
            booking: await newBooking.populate('slots')
        });
    }
    catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ message: 'Error creating booking' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const booking = await Booking_1.Booking.findById(req.params.id)
            .populate('slots');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const payment = booking.payment || {
            status: 'pending',
            amount: 0,
            method: 'free',
            paymentId: undefined
        };
        res.json({
            id: booking._id,
            date: booking.date,
            slots: booking.slots.map((slot) => ({
                start: slot.start,
                end: slot.end,
                courtNumber: slot.courtNumber,
                status: slot.status
            })),
            user: booking.user,
            payment
        });
    }
    catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ message: 'Error fetching booking' });
    }
});
router.post('/:id/cancel', async (req, res) => {
    try {
        const { token } = req.body;
        const booking = await Booking_1.Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        // Verify cancellation token
        if (!token || booking.cancellationToken !== token) {
            return res.status(403).json({ message: 'Invalid cancellation token' });
        }
        // Check if booking is already cancelled
        if (booking.payment && booking.payment.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }
        // Get the booking slot information to check actual start time
        const bookingSlots = await Slot_1.Slot.find({ _id: { $in: booking.slots } }).sort('start');
        if (!bookingSlots || bookingSlots.length === 0) {
            return res.status(400).json({ message: 'No valid slots found for this booking' });
        }
        // Check if the first slot has already started or passed
        const firstSlotStartTime = new Date(bookingSlots[0].start).getTime();
        const now = new Date().getTime();
        if (now >= firstSlotStartTime) {
            return res.status(400).json({
                message: 'Cannot cancel a booking that has already started or passed'
            });
        }
        // Update booking status
        if (booking.payment) {
            booking.payment.status = 'cancelled';
            await booking.save();
        }
        // Update slots status to make them available again
        await Slot_1.Slot.updateMany({ _id: { $in: booking.slots } }, { $set: { status: 'available', booking: null } });
        // If this was a member booking, remove the slots from their usedSlots
        if (booking.payment && booking.payment.method === 'free' && booking.user && booking.user.email) {
            const member = await Member_1.default.findOne({ email: booking.user.email });
            if (member) {
                const currentYear = new Date().getFullYear();
                const yearlySlot = member.yearlySlots.find(year => year.year === currentYear);
                if (yearlySlot) {
                    // Remove the slot IDs from the usedSlots array
                    yearlySlot.usedSlots = yearlySlot.usedSlots.filter((slotId) => !booking.slots.some((bookingSlotId) => bookingSlotId.toString() === slotId.toString()));
                    await member.save();
                }
            }
        }
        // If this was a paid booking, initiate refund
        if (booking.payment && booking.payment.paymentId && booking.payment.method === 'stripe') {
            try {
                const refund = await stripe_1.default.refunds.create({
                    payment_intent: booking.payment.paymentId,
                    reason: 'requested_by_customer'
                });
                // Update payment status to refunded
                booking.payment.status = 'refunded';
                await booking.save();
                console.log('Refund processed successfully:', refund.id);
            }
            catch (refundError) {
                console.error('Refund error:', refundError);
                // Still continue with cancellation even if refund fails
            }
        }
        // Send cancellation confirmation email
        try {
            if (booking.user && booking.user.email && booking.user.name) {
                await (0, email_1.sendCancellationConfirmation)({
                    bookingId: booking._id.toString(),
                    userName: booking.user.name,
                    userEmail: booking.user.email,
                    date: booking.date,
                    slots: bookingSlots.map(slot => ({
                        start: slot.start,
                        end: slot.end,
                        courtNumber: slot.courtNumber
                    }))
                });
            }
        }
        catch (emailError) {
            console.error('Failed to send cancellation confirmation email:', emailError);
            // Don't throw the error, just log it
        }
        res.json({ message: 'Booking cancelled successfully' });
    }
    catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ message: 'Error cancelling booking' });
    }
});
exports.default = router;
