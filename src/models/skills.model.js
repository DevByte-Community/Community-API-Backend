'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Skill extends Model {
    static associate(models) {
      // Skill creator (belongs to one user who created it)
      Skill.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
        onDelete: 'SET NULL',
      });

      // Many-to-many: Users who possess this skill
      Skill.belongsToMany(models.User, {
        through: 'UserSkills',
        foreignKey: 'skillId',
        otherKey: 'userId',
        as: 'users',
      });
    }
  }

  Skill.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: DataTypes.TEXT,
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
    },
    {
      sequelize,
      modelName: 'Skill',
      tableName: 'Skills',
      timestamps: true,
      indexes: [
        {
          name: 'skills_name_idx',
          fields: ['name'],
          unique: true,
        },
      ],
    }
  );

  return Skill;
};
