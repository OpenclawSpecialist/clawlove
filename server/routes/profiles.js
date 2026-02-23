const express = require('express');
const router = express.Router();
const Profile = require('../models/profile');

// GET /api/profiles
router.get('/', (req, res) => {
  try {
    const profiles = Profile.findAll();
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read profiles', detail: err.message });
  }
});

// POST /api/profiles
router.post('/', (req, res) => {
  try {
    const errors = Profile.validate(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const profile = Profile.create(req.body);
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create profile', detail: err.message });
  }
});

// GET /api/profiles/:id
router.get('/:id', (req, res) => {
  try {
    const profile = Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read profile', detail: err.message });
  }
});

// PUT /api/profiles/:id
router.put('/:id', (req, res) => {
  try {
    const errors = Profile.validate(req.body, true);
    if (errors.length) return res.status(400).json({ errors });
    const profile = Profile.update(req.params.id, req.body);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile', detail: err.message });
  }
});

// DELETE /api/profiles/:id
router.delete('/:id', (req, res) => {
  try {
    const deleted = Profile.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Profile not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete profile', detail: err.message });
  }
});

// GET /api/profiles/:id/matches
router.get('/:id/matches', (req, res) => {
  try {
    const matches = Profile.findMatches(req.params.id);
    if (matches === null) return res.status(404).json({ error: 'Profile not found' });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute matches', detail: err.message });
  }
});

module.exports = router;
