'use strict';
// src/models/index.js

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '/../../config/config.js'))[env];
const db = {};

const createLogger = require('../utils/logger');
const logger = createLogger('MODELS');

// First, create the sequelize instance
let sequelize;
try {
  if (config.use_env_variable) {
    logger.info(
      'Using connection string:',
      `${process.env[config.use_env_variable]?.slice(0, 10) || 'NO_ENV_VAR'}#####`
    );
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
  } else {
    // Make sure config has all required properties
    if (!config.database || !config.username) {
      throw new Error('Database configuration is incomplete');
    }
    
    sequelize = new Sequelize(
      config.database, 
      config.username, 
      config.password, 
      {
        host: config.host || 'localhost',
        port: config.port || 5432,
        dialect: config.dialect || 'postgres',
        logging: config.logging !== undefined ? config.logging : false,
      }
    );
  }
  
  // Test the connection
  sequelize.authenticate()
    .then(() => {
      logger.info('Database connection established successfully.');
    })
    .catch(err => {
      logger.error('Unable to connect to the database:', err);
    });
    
} catch (error) {
  logger.error('Failed to create Sequelize instance:', error);
  process.exit(1);
}

// Now load models
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
    try {
      logger.info(`Loading model from: ${file}`);
      
      // Load the model module
      const modelModule = require(path.join(__dirname, file));
      
      // Handle function pattern (most models like blog.model.js, users.model.js)
      if (typeof modelModule === 'function') {
        const model = modelModule(sequelize, Sequelize.DataTypes);
        if (model && model.name) {
          db[model.name] = model;
          logger.info(`✓ Loaded model: ${model.name} (function pattern)`);
        }
      }
      // Handle class pattern (partner.js original style)
      else if (modelModule && modelModule.init && typeof modelModule.init === 'function') {
        // For class pattern, we need to pass sequelize to init
        const model = modelModule.init(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
        logger.info(`✓ Loaded model: ${model.name} (class pattern)`);
      }
      else {
        logger.warn(`✗ File ${file} does not export a valid Sequelize model. Type: ${typeof modelModule}`);
      }
    } catch (error) {
      logger.error(`Error loading model from file ${file}:`, error.message);
      if (error.stack) {
        logger.error('Stack trace:', error.stack);
      }
    }
  });

// Set up associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;