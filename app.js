// Configure any dotenv defined variables
require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

// Load models directory (which loads ./models/index)
const models = require('./models');

const indexRouter = require('./routes/index');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// TODO - use a better secret before we go to prod
// TODO - see notes on cookie.secure here https://github.com/expressjs/session#compatible-session-stores
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());

/**
 * Database configuration
 * The actual connecting to the database happend in `./models/index.js`,
 * this file just syncs the models and verifies the connection is valid
 */
// Sync models - very important step
models.sequelize.sync();
// Check connection
models.sequelize.authenticate().then(() => {
  console.log('Connection to database established.');
}).catch((err) => {
  console.error('Unable to connect to the database:', err);
  // Kill the process because there's no connection to the database
  process.exit();
});

/**
 * custom variable definiton middleware
 * This defines variables for alerting if they do not exist
 * Defines status variable if it does not exist
*/
function createVariablesMiddleware(req, res, next) {
  // create req.locals object if it does not exist
  // req.locals is the prefferred way of passing local variables between middleware
  if (typeof req.locals === 'undefined') {
    req.locals = {};
  }

  // if the status property isn't a number, set it to 200 OK by default
  if (typeof req.locals.status !== 'number') {
    req.locals.status = 200;
  }

  // if the alert object doesn't exist, create it
  if (typeof req.locals.alert === 'undefined') {
    req.locals.alert = {};
  }
  // If the messages arrays don't exist, create
  if (typeof req.locals.alert.errorMessages === 'undefined' || !Array.isArray(req.locals.alert.errorMessages)) {
    req.locals.alert.errorMessages = [];
  }
  if (typeof req.locals.alert.infoMessages === 'undefined' || !Array.isArray(req.locals.alert.infoMessages)) {
    req.locals.alert.infoMessages = [];
  }
  if (typeof req.locals.alert.successMessages === 'undefined' || !Array.isArray(req.locals.alert.successMessages)) {
    req.locals.alert.successMessages = [];
  }
  // continue execution to next middleware handler
  next();
}
app.use(createVariablesMiddleware);

/**
 * define routes
 */
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res/* , next */) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/**
 * Database configuration
 * The actual connecting to the database happend in `./models/index.js`,
 * this file just syncs the models and verifies the connection is valid
 */
// Sync models - very important step
models.sequelize.sync();
// Check connection
models.sequelize.authenticate().then(() => {
  console.log('Connection to database established.');
}).catch((err) => {
  console.error('Unable to connect to the database:', err);
  // Kill the process because there's no connection to the database
  process.exit();
});

/**
 * Passport configuration
 *
 */
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
  },
  (username, password, done) => {
    models.Member.findOne({
      where: {
        email: username,
      },
    }).then((member) => {
      if (member) {
        // Member exists, validate password
        return models.Member.comparePassword(password, member).then((res) => {
          if (res === false) {
            return done(null, false, { message: 'Incorrect password.' });
          }
          // Member is found and has a valid password
          return done(null, member);
        });
      }
      // Member doesn't exist, throw an error
      return done(null, false, { message: 'Member not found.' });
    });
  },
));

// takes the user(Member) and converts it to just an id for the client session cookie
passport.serializeUser((user, done) => {
  done(null, user.email);
});

// converts the cookie from the client into an instance of Member upon a request
passport.deserializeUser((id, done) => {
  models.Member.findOne({
    where: {
      email: id,
    },
  }).then((member) => {
    return done(null, member);
  }).catch((err) => {
    return done(err, null);
  });
});

module.exports = app;
