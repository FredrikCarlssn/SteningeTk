import express from 'express';
import { Member } from '../models/Member'; // We'll create this model

const router = express.Router();
// Check if user is a member & how many slots they have remaining
router.get('/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const currentYear = new Date().getFullYear();
    const member = await Member.findOne({ email });
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    // Check yearly slots - > if current year is not in the array, add it, else return the number of used slots/ slots length 
    const yearlySlots = member.yearlySlots.find((year: { year: number }) => year.year === currentYear);
    if (!yearlySlots) {
      member.yearlySlots.push({ year: currentYear, usedSlots: [] });
      await member.save();
    }
    res.json({
      isMember: true,
      slotsRemaining: 10 - yearlySlots.usedSlots.length
    });
  } catch (error) {
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
    const existingMember = await Member.findOne({ email });
    if (existingMember) {
      return res.status(400).json({ error: 'Member already exists' });
    }

    // Create new member with current year's entry
    const currentYear = new Date().getFullYear();
    const newMember = new Member({
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
// remove member
router.delete('/:email', async (req, res) => {
  try {
    const { email } = req.params;
    await Member.findOneAndDelete({ email });
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// get all members
router.get('/', async (req, res) => {
  try {
    const members = await Member.find();
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 