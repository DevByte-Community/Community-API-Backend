'use strict';
const { Model } = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = (sequelize, DataTypes) => {
  class Learning extends Model {
    static associate(models) {
      // Learning owner (the user who created it)
      Learning.belongsTo(models.User, {
        foreignKey: {
          name: 'userId',
          field: 'user_id',
        },
        as: 'owner',
        onDelete: 'CASCADE',
      });

      // Learning learners (many-to-many)
      Learning.belongsToMany(models.User, {
        through: 'LearningLearners',
        foreignKey: 'learningId',
        otherKey: 'userId',
        as: 'learners',
      });

      // Learning techs (many-to-many)
      Learning.belongsToMany(models.Tech, {
        through: 'LearningTechs',
        foreignKey: 'learningId',
        otherKey: 'techId',
        as: 'techs',
      });
    }
  }

  Learning.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Learning name is required',
          },
          notEmpty: {
            msg: 'Learning name cannot be empty',
          },
          len: {
            args: [1, 255],
            msg: 'Learning name must be between 1 and 255 characters',
          },
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 1000],
            msg: 'Description cannot exceed 1000 characters',
          },
        },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      contentUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'content_url',
        validate: {
          isUrl: {
            msg: 'Content URL must be a valid URL',
          },
        },
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: {
            args: [1],
            msg: 'Duration must be at least 1 minute',
          },
        },
      },
      level: {
        type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['BEGINNER', 'INTERMEDIATE', 'ADVANCED']],
            msg: 'Level must be one of: BEGINNER, INTERMEDIATE, ADVANCED',
          },
        },
      },
    },
    {
      sequelize,
      modelName: 'Learning',
      tableName: 'Learnings',
      timestamps: true,
      indexes: [
        {
          name: 'learnings_name_idx',
          fields: ['name'],
        },
        {
          name: 'learnings_user_id_idx',
          fields: ['user_id'],
        },
        {
          name: 'learnings_level_idx',
          fields: ['level'],
        },
      ],
    }
  );

  return Learning;
};
