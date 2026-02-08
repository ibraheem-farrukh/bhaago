const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Run = require('../models/Run');
const Route = require('../models/Route');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined, // Use default credential chain if not set
});

const BUCKET = process.env.S3_BUCKET || 'bhaago-photos';

// ============ RUNS ============

// Create a new run for a route
router.post('/routes/:routeId/runs', protect, async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    if (route.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, date, distance, duration, avgPace, calories, notes, weather } = req.body;

    const run = await Run.create({
      route: route._id,
      user: req.user._id,
      name: name || `Run on ${new Date(date || Date.now()).toLocaleDateString()}`,
      date: date || Date.now(),
      distance: distance || route.distance,
      duration,
      avgPace,
      calories,
      notes,
      weather,
      photos: []
    });

    res.status(201).json(run);
  } catch (error) {
    console.error('Create run error:', error);
    res.status(500).json({ message: 'Server error creating run', error: error.message });
  }
});

// List runs for a route
router.get('/routes/:routeId/runs', protect, async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    if (route.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const runs = await Run.find({ route: route._id }).sort({ date: -1 });
    res.json(runs);
  } catch (error) {
    console.error('List runs error:', error);
    res.status(500).json({ message: 'Server error listing runs', error: error.message });
  }
});

// Get single run
router.get('/runs/:runId', protect, async (req, res) => {
  try {
    const run = await Run.findById(req.params.runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if (run.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(run);
  } catch (error) {
    console.error('Get run error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update run
router.patch('/runs/:runId', protect, async (req, res) => {
  try {
    const run = await Run.findById(req.params.runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if (run.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, notes, weather, duration, avgPace, calories } = req.body;
    if (name !== undefined) run.name = name;
    if (notes !== undefined) run.notes = notes;
    if (weather !== undefined) run.weather = weather;
    if (duration !== undefined) run.duration = duration;
    if (avgPace !== undefined) run.avgPace = avgPace;
    if (calories !== undefined) run.calories = calories;

    await run.save();
    res.json(run);
  } catch (error) {
    console.error('Update run error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete run
router.delete('/runs/:runId', protect, async (req, res) => {
  try {
    const run = await Run.findById(req.params.runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if (run.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Delete photos from S3
    for (const photo of run.photos) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: photo.key }));
      } catch (e) {
        console.error('Error deleting photo from S3:', e);
      }
    }

    await run.deleteOne();
    res.json({ message: 'Run deleted' });
  } catch (error) {
    console.error('Delete run error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ PHOTOS ============

// Get presigned upload URL
router.post('/runs/:runId/photos/presign', protect, async (req, res) => {
  try {
    const run = await Run.findById(req.params.runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if (run.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
      return res.status(400).json({ message: 'filename and contentType required' });
    }

    const ext = filename.split('.').pop();
    const key = `runs/${run._id}/${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

    res.json({
      uploadUrl,
      key,
      url: `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
    });
  } catch (error) {
    console.error('Presign error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Confirm photo upload and add to run
router.post('/runs/:runId/photos', protect, async (req, res) => {
  try {
    const run = await Run.findById(req.params.runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if (run.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { key, url, caption, location } = req.body;
    if (!key) return res.status(400).json({ message: 'Photo key required' });

    const photo = {
      key,
      url: url || `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
      caption: caption || '',
      location: location ? { type: 'Point', coordinates: location } : undefined,
      tags: [],
      tagsProcessed: false,
      createdAt: new Date()
    };

    run.photos.push(photo);
    await run.save();

    res.status(201).json(run.photos[run.photos.length - 1]);
  } catch (error) {
    console.error('Add photo error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete photo from run
router.delete('/runs/:runId/photos/:photoId', protect, async (req, res) => {
  try {
    const run = await Run.findById(req.params.runId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    if (run.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const photo = run.photos.id(req.params.photoId);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    // Delete from S3
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: photo.key }));
    } catch (e) {
      console.error('Error deleting photo from S3:', e);
    }

    photo.deleteOne();
    await run.save();
    res.json({ message: 'Photo deleted' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
