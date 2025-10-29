'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Skill extends Model {
    static associate(_models) {
      // A skill can belong to many users
      // Skill.belongsToMany(models.User, {
      //   through: 'UserSkills',
      //   foreignKey: 'skillId',
      //   otherKey: 'userId',
      // });
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
        unique: true,
        allowNull: false,
      },
      description: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'Skill',
      tableName: 'Skills',
      timestamps: true,
      indexes: [
        {
          // This creates a case-insensitive unique index
          unique: true,
          fields: [sequelize.fn("lower", sequelize.col("name"))]
        }
      ]
    }
  );

  return Skill;
};
