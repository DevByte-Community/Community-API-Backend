'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Skill extends Model {
    static associate(models) {
      Skill.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
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
        defaultValue: () => uuidv7(),
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      description: DataTypes.TEXT,
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
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
          fields: [sequelize.fn('lower', sequelize.col('name'))],
        },
      ],
    }
  );

  return Skill;
};
