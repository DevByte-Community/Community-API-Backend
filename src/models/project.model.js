'use strict';
const { Model } = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = (sequelize, DataTypes) => {
  class Project extends Model {
    static associate(models) {
      // Project creator
      Project.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'creator',
        onDelete: 'CASCADE',
      });

      // Project techs (many-to-many)
      Project.belongsToMany(models.Tech, {
        through: models.ProjectTech,
        foreignKey: 'projectId',
        otherKey: 'techId',
        as: 'techs',
      });

      // Project contributors (many-to-many with users)
      Project.belongsToMany(models.User, {
        through: models.ProjectContributor,
        foreignKey: 'projectId',
        otherKey: 'userId',
        as: 'contributors',
      });

      // Project partners (many-to-many)
      // Project.belongsToMany(models.Partner, {
      //   through: models.ProjectPartner,
      //   foreignKey: 'projectId',
      //   otherKey: 'partnerId',
      //   as: 'partners',
      // });

      // Direct associations for easier querying
      Project.hasMany(models.ProjectTech, {
        foreignKey: 'projectId',
        as: 'projectTechs',
      });

      Project.hasMany(models.ProjectContributor, {
        foreignKey: 'projectId',
        as: 'projectContributors',
      });

      // Project.hasMany(models.ProjectPartner, {
      //   foreignKey: 'projectId',
      //   as: 'projectPartners',
      // });
    }
  }

  Project.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Project title is required',
          },
          notEmpty: {
            msg: 'Project title cannot be empty',
          },
          len: {
            args: [1, 255],
            msg: 'Project title must be between 1 and 255 characters',
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: {
            args: [0, 5000],
            msg: 'Description cannot exceed 5000 characters',
          },
        },
      },
      coverImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      repoLink: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Project',
      tableName: 'Projects',
      timestamps: true,
      paranoid: true,
      indexes: [
        {
          name: 'projects_title_idx',
          fields: ['title'],
        },
        {
          name: 'projects_created_by_idx',
          fields: ['createdBy'],
        },
        {
          name: 'projects_featured_idx',
          fields: ['featured'],
        },
        {
          name: 'projects_last_updated_idx',
          fields: ['lastUpdated'],
        },
      ],
    }
  );

  return Project;
};
