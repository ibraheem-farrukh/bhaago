const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
  key: { type: String, required: true }, // S3 object key
  url: { type: String }, // Full S3 URL (for convenience)
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] } // [lng, lat] - where photo was taken
  },
  caption: { type: String, default: '' },
  tags: [String], // Rekognition labels
  tagsProcessed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

PhotoSchema.index({ location: '2dsphere' });

const RunSchema = new mongoose.Schema({
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: '' }, // Optional run name
  date: { type: Date, default: Date.now },
  
  // Stats
  distance: { type: Number }, // meters
  duration: { type: Number }, // seconds
  avgPace: { type: Number }, // min/km
  calories: { type: Number },
  
  // GPS track (optional - if they recorded live)
  track: {
    type: { type: String, enum: ['LineString'] },
    coordinates: [[Number]]
  },
  
  // Photos taken during this run
  photos: [PhotoSchema],
  
  notes: { type: String, default: '' },
  weather: { type: String }, // Optional weather note
  
  createdAt: { type: Date, default: Date.now }
});

RunSchema.index({ route: 1, date: -1 });

module.exports = mongoose.model('Run', RunSchema);
