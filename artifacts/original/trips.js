const mongoose = require('mongoose');
const Trip = require('../models/travlr'); // Register schema model
const Model = mongoose.model('trips');

// GET: /trips - lists all the trips
const tripsList = async(req, res) => {
    const q = await Model
    .find({}) // No filter, return all records
    .exec();

    console.log(q);

    if(!q) { 
        return res
            .status(404)
            .json({ "message": "No trips found" });
    } else { 
        return res
            .status(200)
            .json(q);
    }
};

// GET: /trips/:tripCode - lists a single trip
const tripsFindByCode = async(req, res) => {
    const q = await Model
    .find({'code': req.params.tripCode}) // Return single record
    .exec();

    console.log(q);

    if(!q) { 
        return res
            .status(404)
            .json({ "message": "Trip not found" });
    } else { 
        return res
            .status(200)
            .json(q);
    }
};

// POST: /trips - adds a new trip to the database
const tripsAddTrip = async (req, res) => {
    try {
        const newTrip = await Model.create({
            code: req.body.code,
            name: req.body.name,
            length: req.body.length,
            start: req.body.start,
            resort: req.body.resort,
            perPerson: req.body.perPerson,
            image: req.body.image,
            description: req.body.description
        });
        
        return res.status(201).json(newTrip);
    } catch (err) {
        console.error('Error inserting trip into database:', err);
        return res.status(400).json(err);
    }
};

// PUT: /trips/:tripCode - updates an existing trip in the database 🌟
const tripsUpdateTrip = async (req, res) => {
    try {
        const updatedTrip = await Model.findOneAndUpdate(
            { 'code': req.params.tripCode }, // Find by code from the route parameters
            {
                code: req.body.code,
                name: req.body.name,
                length: req.body.length,
                start: req.body.start,
                resort: req.body.resort,
                perPerson: req.body.perPerson,
                image: req.body.image,
                description: req.body.description
            },
            { new: true } // Option to return the newly updated document
        );

        if (!updatedTrip) {
            return res
                .status(404)
                .json({ "message": `Trip code ${req.params.tripCode} not found.` });
        }

        return res.status(200).json(updatedTrip);
    } catch (err) {
        console.error('Error updating trip in database:', err);
        return res.status(400).json(err);
    }
};

module.exports = {
    tripsList,
    tripsFindByCode,
    tripsAddTrip,
    tripsUpdateTrip // 👈 Exporting the update method
};