// 1. Load environment variables FIRST before any configuration reads process.env
require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var handlebars = require('hbs');
var passport = require('passport');

// 2. Bring in Database Models & Database Connection
require('./app_api/models/db'); // Ensure db.js requires ./user and ./travlr

// 3. Load Passport Strategy Configuration (AFTER models are registered)
require('./app_api/config/passport');

// 4. Define Routers
//var indexRouter = require('./app_server/routes/index');
var usersRouter = require('./app_server/routes/users');
var travelRouter = require('./app_server/routes/travel');
var apiRouter = require('./app_api/routes/index');

var app = express();

// View Engine Setup
handlebars.registerPartials(path.join(__dirname, 'app_server', 'views', 'partials'));
app.set('views', path.join(__dirname, 'app_server', 'views'));
app.set('view engine', 'hbs');

// Middleware Stack
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Passport Middleware
app.use(passport.initialize());

// Enable CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:4200");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Route Handlers
//app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/travel', travelRouter);
app.use('/api', apiRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Unauthorized Error Handler (Must come BEFORE generic error handler)
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res
      .status(401)
      .json({ "message": err.name + ": " + err.message });
  }
  next(err);
});

// Generic Error Handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;