'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserSkills extends Model {
    static associate(models) {}
  }

  UserSkills.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      skillId: {
        type: DataTypes.INTEGER,
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
