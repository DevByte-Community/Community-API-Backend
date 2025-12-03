'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserSkills extends Model {
    static associate(models) {
      UserSkills.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      UserSkills.belongsTo(models.Skill, {
        foreignKey: 'skillId',
        as: 'skill',
      });
    }
  }

  UserSkills.init(
    {
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      skillId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Skills', key: 'id' },
        onDelete: 'CASCADE',
      },
    },
    {
      sequelize,
      modelName: 'UserSkills',
      tableName: 'UserSkills',
      timestamps: true,
    }
  );

  return UserSkills;
};
