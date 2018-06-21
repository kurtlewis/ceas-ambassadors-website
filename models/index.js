/* eslint-disable */
/**
 * This file is auto-generated by sequelize-cli, and as such I have turned off eslint for it
 * So what is going on here?
 * This file loads the database connection data from ../config/config.js and then starts an instance
 * of sequelize. Then it does some magic to combine the models defined in this folder into a single
 * aggregate object, associating models that are supposed to be associated
 */
'use strict';

var fs        = require('fs');
var path      = require('path');
var Sequelize = require('sequelize');
var basename  = path.basename(__filename);
var env       = 'development';//process.env.NODE_ENV || 'development';
var config    = 0;//require(__dirname + '/../config/config.js')[env];
var db        = {};

function UserException(message) {
  this.message = message;
  this.name = 'UserException';
}

if (typeof env == 'undefined'){
  throw new UserException('env is undefined')
} else if (env != 'development' || env != 'test' || env != 'production') {
  throw new UserException('Invalid environment variable in /../models/index.js')
}

// Checks if config.url is defined
if (typeof config.url == 'undefined') {
  throw new UserException('Invalid config.url in /../models/index.js')
}



// if (env != 'development' || env != 'production' || env != 'test') throw "Check env in index.js";

var sequelize = new Sequelize(config.url, config);

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    var model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
