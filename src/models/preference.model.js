'use strict';
const { Model } = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = (sequelize, DataTypes) => {
  class Preference extends Model {
    static associate(models) {
      Preference.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  Preference.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv7(),
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users', // matches your Users table
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      visibility: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notification: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      newsletter: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      appearance: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'system',
      },
      language: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'en',
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UTC',
      },
    },
    {
      sequelize,
      modelName: 'Preference',
      tableName: 'Preferences', // db table name
      timestamps: true,
    }
  );

  return Preference;
};
