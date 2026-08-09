const mongoose = require('mongoose');
const Trip = require('../models/travlr'); 
const Model = mongoose.model('trips');

// ============================================================================
// SECURITY & INPUT SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitizes input parameters to prevent NoSQL Injection attacks.
 * Casts values to string primitives and strips MongoDB query operators ($) and braces ({}, []).
 */
const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return input.replace(/[\$\{\}\[\]]/g, '').trim();
    }
    if (typeof input === 'number' || typeof input === 'boolean') {
        return input;
    }
    return String(input || '').replace(/[\$\{\}\[\]]/g, '').trim();
};

/**
 * Validates and converts incoming numeric inputs for price calculations.
 */
const sanitizeNumber = (input, defaultValue = 0) => {
    const parsed = parseFloat(input);
    return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
};

// ============================================================================
// DATA STRUCTURES & ALGORITHMIC HELPERS
// ============================================================================

// 1. HASH MAP CACHE WITH LRU EVICTION CAPACITY - O(1)
const CACHE_CAPACITY = 250;
const tripCache = new Map(); // Key: tripCode, Value: trip object

/**
 * Inserts or updates an item in the hash map with LRU eviction strategy.
 */
const setCacheItem = (key, value) => {
    if (!key) return;
    if (tripCache.has(key)) {
        tripCache.delete(key); // Refresh key priority
    } else if (tripCache.size >= CACHE_CAPACITY) {
        // Evict the least recently used item (first key in Map iterator)
        const oldestKey = tripCache.keys().next().value;
        tripCache.delete(oldestKey);
    }
    tripCache.set(key, value);
};

/**
 * Retrieves item from cache and refreshes LRU priority.
 */
const getCacheItem = (key) => {
    if (!key || !tripCache.has(key)) return null;
    const value = tripCache.get(key);
    tripCache.delete(key);
    tripCache.set(key, value);
    return value;
};

// 2. BINARY SEARCH TREE (BST) FOR PRICE RANGE SEARCHES - O(log n)
class BSTNode {
    constructor(trip) {
        this.price = parseFloat(trip.perPerson) || 0;
        this.trips = [trip];
        this.left = null;
        this.right = null;
    }
}

class PriceBST {
    constructor() {
        this.root = null;
    }

    insert(trip) {
        if (!trip || trip.perPerson === undefined) return;
        const price = parseFloat(trip.perPerson) || 0;
        
        if (!this.root) {
            this.root = new BSTNode(trip);
            return;
        }

        let current = this.root;
        while (current) {
            if (price === current.price) {
                // Handle duplicate prices by appending to node list
                current.trips.push(trip);
                return;
            } else if (price < current.price) {
                if (!current.left) {
                    current.left = new BSTNode(trip);
                    return;
                }
                current = current.left;
            } else {
                if (!current.right) {
                    current.right = new BSTNode(trip);
                    return;
                }
                current = current.right;
            }
        }
    }

    // In-order traversal to find trips within [minPrice, maxPrice] in O(log n + k) time
    findRange(minPrice, maxPrice) {
        const results = [];
        const searchNode = (node) => {
            if (!node) return;
            if (minPrice < node.price) searchNode(node.left);
            if (node.price >= minPrice && node.price <= maxPrice) {
                results.push(...node.trips);
            }
            if (maxPrice > node.price) searchNode(node.right);
        };
        searchNode(this.root);
        return results;
    }

    clear() {
        this.root = null;
    }
}

const priceIndexBST = new PriceBST();

/**
 * Synchronizes incoming MongoDB docs with Hash Map and BST indexes
 */
const syncIndexes = (trips) => {
    if (Array.isArray(trips)) {
        trips.forEach(trip => {
            if (trip && trip.code) {
                setCacheItem(trip.code, trip);
                priceIndexBST.insert(trip);
            }
        });
    } else if (trips && trips.code) {
        setCacheItem(trips.code, trips);
        priceIndexBST.insert(trips);
    }
};

// ============================================================================
// ROUTE CONTROLLERS
// ============================================================================

// GET: /trips - lists trips with pagination support
const tripsList = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 100)); 
        const skip = (page - 1) * limit;

        const q = await Model
            .find({})
            .skip(skip)
            .limit(limit)
            .exec();

        if (!q || q.length === 0) {
            return res.status(404).json({ message: "No trips found" });
        }

        syncIndexes(q);

        return res.status(200).json(q);
    } catch (err) {
        console.error('Error fetching trips:', err);
        return res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
};

// GET: /trips/search/price - O(log n) BST price range query
const tripsSearchByPriceRange = async (req, res) => {
    const min = sanitizeNumber(req.query.min, 0);
    const max = req.query.max !== undefined ? sanitizeNumber(req.query.max, Infinity) : Infinity;

    // Execute in-memory BST traversal
    const matchingTrips = priceIndexBST.findRange(min, max);

    if (matchingTrips.length > 0) {
        return res.status(200).json({
            source: "BST_Memory_Index",
            count: matchingTrips.length,
            data: matchingTrips
        });
    }

    // Fallback database lookup
    try {
        const q = await Model.find({
            perPerson: { $gte: min, $lte: max }
        }).exec();

        syncIndexes(q);
        return res.status(200).json({
            source: "Database_Query",
            count: q.length,
            data: q
        });
    } catch (err) {
        return res.status(500).json({ message: "Error performing price search", error: err.message });
    }
};

// GET: /trips/:tripCode - lists a single trip with O(1) cache lookup
const tripsFindByCode = async (req, res) => {
    const tripCode = sanitizeInput(req.params.tripCode);

    // 1. O(1) Hash Map Cache Lookup
    const cachedTrip = getCacheItem(tripCode);
    if (cachedTrip) {
        console.log(`[Cache Hit]: Trip code ${tripCode} retrieved from LRU hash map.`);
        return res.status(200).json(cachedTrip);
    }

    try {
        // 2. Fallback DB lookup with sanitized key
        const q = await Model.findOne({ code: tripCode }).exec();

        if (!q) { 
            return res.status(404).json({ message: `Trip code ${tripCode} not found` });
        }

        syncIndexes(q);

        return res.status(200).json(q);
    } catch (err) {
        console.error('Error finding trip by code:', err);
        return res.status(500).json({ message: "Error retrieving trip", error: err.message });
    }
};

// POST: /trips - adds a new trip to the database & updates indexes
const tripsAddTrip = async (req, res) => {
    try {
        const newTrip = await Model.create({
            code: sanitizeInput(req.body.code),
            name: sanitizeInput(req.body.name),
            length: sanitizeInput(req.body.length),
            start: req.body.start,
            resort: sanitizeInput(req.body.resort),
            perPerson: sanitizeNumber(req.body.perPerson, 0),
            image: sanitizeInput(req.body.image),
            description: sanitizeInput(req.body.description)
        });

        syncIndexes(newTrip);
        
        return res.status(201).json(newTrip);
    } catch (err) {
        console.error('Error inserting trip into database:', err);
        return res.status(400).json({ message: "Failed to create trip", error: err.message });
    }
};

// PUT: /trips/:tripCode - updates an existing trip in database & updates indexes
const tripsUpdateTrip = async (req, res) => {
    try {
        const tripCode = sanitizeInput(req.params.tripCode);

        const updatedTrip = await Model.findOneAndUpdate(
            { code: tripCode }, 
            {
                code: sanitizeInput(req.body.code || tripCode),
                name: sanitizeInput(req.body.name),
                length: sanitizeInput(req.body.length),
                start: req.body.start,
                resort: sanitizeInput(req.body.resort),
                perPerson: sanitizeNumber(req.body.perPerson, 0),
                image: sanitizeInput(req.body.image),
                description: sanitizeInput(req.body.description)
            },
            { new: true, runValidators: true } // Run schema validations on update
        );

        if (!updatedTrip) {
            return res.status(404).json({ message: `Trip code ${tripCode} not found.` });
        }

        syncIndexes(updatedTrip);

        return res.status(200).json(updatedTrip);
    } catch (err) {
        console.error('Error updating trip in database:', err);
        return res.status(400).json({ message: "Failed to update trip", error: err.message });
    }
};

// DELETE: /trips/:tripCode - removes a trip and purges cache/index entries
const tripsDeleteTrip = async (req, res) => {
    const tripCode = sanitizeInput(req.params.tripCode);

    try {
        const deletedTrip = await Model.findOneAndDelete({ code: tripCode });

        if (!deletedTrip) {
            return res.status(404).json({ message: `Trip code ${tripCode} not found.` });
        }

        // Remove from Hash Map Cache
        tripCache.delete(tripCode);

        // Rebuild BST to maintain balanced node structure after deletion
        priceIndexBST.clear();
        const remainingTrips = await Model.find({}).exec();
        syncIndexes(remainingTrips);

        return res.status(200).json({ message: "Trip deleted successfully", trip: deletedTrip });
    } catch (err) {
        console.error('Error deleting trip:', err);
        return res.status(500).json({ message: "Failed to delete trip", error: err.message });
    }
};

module.exports = {
    tripsList,
    tripsFindByCode,
    tripsSearchByPrice: tripsSearchByPriceRange, // Alias to match routes/index.js
    tripsSearchByPriceRange,                      // Retained for backward compatibility
    tripsAddTrip,
    tripsUpdateTrip,
    tripsDeleteTrip
};