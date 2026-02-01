const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const { protect } = require('../middleware/auth');

// Create a new route
router.post('/', protect, async (req, res) => {
  try {
    const { name, coordinates, distance, duration, photos, tags, waypoints } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ message: 'At least two coordinates are required' });
    }

    // Convert incoming coords [lat,lng] to GeoJSON [lng,lat]
    const geoCoords = coordinates.map(c => [c[1], c[0]]);

    // Waypoints expected as array of [lat, lng] pairs from client
    const wp = Array.isArray(waypoints) ? waypoints : [];

    const route = await Route.create({
      user: req.user._id,
      name: name || `Route ${new Date().toISOString()}`,
      geometry: { type: 'LineString', coordinates: geoCoords },
      distance,
      duration,
      photos: photos || [],
      tags: tags || [],
      waypoints: wp
    });

    res.status(201).json(route);
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ message: 'Server error creating route', error: error.message });
  }
});

// List user's routes
router.get('/', protect, async (req, res) => {
  try {
    const routes = await Route.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(routes);
  } catch (error) {
    console.error('List routes error:', error);
    res.status(500).json({ message: 'Server error listing routes', error: error.message });
  }
});

// Get single route
router.get('/:id', protect, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    if (route.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    res.json(route);
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete route
router.delete('/:id', protect, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    if (route.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    // use deleteOne() on the document (remove() may not be available in this Mongoose version)
    await route.deleteOne();
    res.json({ message: 'Route deleted' });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
