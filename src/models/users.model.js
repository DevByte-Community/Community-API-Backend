'use strict';
const { Model } = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User preferences
      User.hasOne(models.Preference, {
        foreignKey: 'userId',
        as: 'preferences',
        onDelete: 'CASCADE',
      });

      // Skills created by this user
      User.hasMany(models.Skill, {
        foreignKey: 'createdBy',
        as: 'createdSkills',
        onDelete: 'SET NULL',
      });

      // Many-to-many: Skills possessed by this user
      User.belongsToMany(models.Skill, {
        through: 'UserSkills',
        foreignKey: 'userId',
        otherKey: 'skillId',
        as: 'skills',
      });
    }

    /**
     * Check if user has sufficient role permissions
     * @param {string} requiredRole - The role to check against
     * @returns {boolean}
     */
    hasRole(requiredRole) {
      const hierarchy = { USER: 1, ADMIN: 2, ROOT: 3 };
      return hierarchy[this.role] >= hierarchy[requiredRole];
    }

    /**
     * Check if user can assign a specific role
     * @param {string} targetRole - The role to be assigned
     * @returns {boolean}
     */
    canAssignRole(targetRole) {
      // ROOT can only be assigned by system (not through API)
      if (targetRole === 'ROOT') return false;

      // ADMIN and ROOT can assign ADMIN
      if (targetRole === 'ADMIN') {
        return this.role === 'ADMIN' || this.role === 'ROOT';
      }

      // ADMIN and ROOT can assign USER
      if (targetRole === 'USER') {
        return this.role === 'ADMIN' || this.role === 'ROOT';
      }

      return false;
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv7(),
        primaryKey: true,
      },
      fullname: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('USER', 'ADMIN', 'ROOT'),
        allowNull: false,
        defaultValue: 'USER',
      },
      profilePicture: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      timestamps: true,
    }
  );

  return User;
};
