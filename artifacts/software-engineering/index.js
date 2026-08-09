const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const tripsController = require('../controllers/trips');
const authenticationController = require('../controllers/authentication');

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================
router.route("/register").post(authenticationController.register);
router.route("/login").post(authenticationController.login);

// ============================================================================
// TRIPS API ROUTES
// ============================================================================

// Collection Routes: Public GET, Protected POST
router
  .route("/trips")
  .get(tripsController.tripsList)
  .post(authenticateJWT, tripsController.tripsAddTrip);

// Specialized BST Search (Defined BEFORE /trips/:tripCode to avoid route collisions)
router
  .route("/trips/search/price")
  .get(tripsController.tripsSearchByPrice);

// Document Routes: Public GET, Protected PUT & DELETE
router
  .route("/trips/:tripCode")
  .get(tripsController.tripsFindByCode)
  .put(authenticateJWT, tripsController.tripsUpdateTrip)
  .delete(authenticateJWT, tripsController.tripsDeleteTrip);

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

/**
 * Validates incoming JSON Web Tokens (JWT) for protected mutation endpoints.
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    console.log('Auth Header Required but NOT PRESENT!');
    return res.status(401).json({ message: 'Authorization header required.' });
  }

  const headers = authHeader.split(' ');
  if (headers.length < 2 || !headers[1]) {
    console.log('Malformed Authorization Header');
    return res.status(401).json({ message: 'Malformed Bearer token.' });
  }

  const token = headers[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, verified) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(401).json({ message: 'Token Validation Error!' });
    }
    req.auth = verified;
    next();
  });
}

module.exports = router;