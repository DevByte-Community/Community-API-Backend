'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '/../../config/config.js'))[env];
const db = {};

const createLogger = require('../utils/logger');
const logger = createLogger('MODELS');

let sequelize;
if (config.use_env_variable) {
  logger.info(
    'Using connection string:',
    `${process.env[config.use_env_variable].slice(0, 10)}#####`
  );
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging !== undefined ? config.logging : false, // Disable SQL query logging
  });
}

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach((file) => {
    const requiredModule = require(path.join(__dirname, file));
    if (typeof requiredModule !== 'function') {
      return; // skip files not exporting a factory
    }
    const model = requiredModule(sequelize, Sequelize.DataTypes);
    if (model && model.name) {
      db[model.name] = model;
    }
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
