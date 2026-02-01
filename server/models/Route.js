const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: 'My Route' },
  geometry: {
    type: { type: String, enum: ['LineString'], required: true },
    coordinates: { type: [[Number]], required: true } // [[lng, lat], ...]
  },
  // Waypoints are the user-placed marker positions in [lat, lng] format
  waypoints: { type: [[Number]], default: [] },
  distance: { type: Number },
  duration: { type: Number },
  photos: [String],
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

RouteSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Route', RouteSchema);
