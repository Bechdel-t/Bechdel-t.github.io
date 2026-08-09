const mongoose = require('mongoose');

// Define the trip schema with validations, indexing, and types
const tripSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: [true, 'Trip code is required.'], 
    unique: true,
    trim: true,
    index: true 
  },
  name: { 
    type: String, 
    required: [true, 'Trip name is required.'], 
    trim: true,
    index: true 
  },
  length: { 
    type: String, 
    required: [true, 'Trip length is required.'], 
    trim: true 
  },
  start: { 
    type: Date, 
    required: [true, 'Start date is required.'] 
  },
  resort: { 
    type: String, 
    required: [true, 'Resort name is required.'], 
    trim: true 
  },
  perPerson: { 
    type: Number, 
    required: [true, 'Per-person cost is required.'],
    min: [0, 'Cost per person cannot be negative.']
  },
  image: { 
    type: String, 
    required: [true, 'Image path is required.'], 
    trim: true 
  },
  description: { 
    type: String, 
    required: [true, 'Description is required.'], 
    trim: true 
  }
}, {
  timestamps: true // Automatically generates createdAt and updatedAt fields
});

const Trip = mongoose.model('trips', tripSchema);
module.exports = Trip;