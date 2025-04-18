"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Member_1 = __importDefault(require("../models/Member"));
const router = express_1.default.Router();
// Check if user is a member & how many slots they have remaining
router.get('/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const currentYear = new Date().getFullYear();
        const member = await Member_1.default.findOne({ email });
        if (!member) {
            return res.json({
                isMember: false,
                slotsRemaining: 0
            });
        }
        // Check yearly slots - > if current year is not in the array, add it, else return the number of used slots/ slots length 
        const yearlySlots = member.yearlySlots.find((slot) => slot.year === currentYear);
        if (!yearlySlots) {
            member.yearlySlots.push({ year: currentYear, usedSlots: [] });
            await member.save();
            return res.json({
                isMember: true,
                slotsRemaining: 10
            });
        }
        res.json({
            isMember: true,
            slotsRemaining: 10 - yearlySlots.usedSlots.length
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Create new member
router.post('/', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        // Check if member already exists
        const existingMember = await Member_1.default.findOne({ email });
        if (existingMember) {
            return res.status(400).json({ error: 'Member already exists' });
        }
        // Create new member with current year's entry
        const currentYear = new Date().getFullYear();
        const newMember = new Member_1.default({
            email,
            yearlySlots: [{
                    year: currentYear,
                    usedSlots: []
                }]
        });
        await newMember.save();
        res.status(201).json({
            message: 'Member added successfully',
            member: {
                email: newMember.email,
                slotsUsed: newMember.yearlySlots[0].usedSlots,
                createdAt: newMember.createdAt
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// remove member
router.delete('/', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        await Member_1.default.findOneAndDelete({ email });
        res.json({ message: 'Member removed successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// get all members
router.get('/', async (req, res) => {
    try {
        const members = await Member_1.default.find();
        res.json(members);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Update member email
router.put('/', async (req, res) => {
    try {
        const { oldEmail, newEmail } = req.body;
        if (!oldEmail || !newEmail) {
            return res.status(400).json({ error: 'Both old and new email are required' });
        }
        // Find member with old email
        const member = await Member_1.default.findOne({ email: oldEmail });
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }
        // Check if new email is already in use by another member
        const existingMember = await Member_1.default.findOne({ email: newEmail });
        if (existingMember && existingMember._id.toString() !== member._id.toString()) {
            return res.status(400).json({ error: 'New email already in use by another member' });
        }
        // Update the email
        member.email = newEmail;
        await member.save();
        res.json({
            message: 'Email updated successfully',
            member: {
                email: member.email,
                id: member._id
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
