'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Preferences', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      visibility: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notification: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      newsletter: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      appearance: {
        type: Sequelize.ENUM('system', 'light', 'dark'),
        allowNull: false,
        defaultValue: 'system',
      },
      language: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'en',
      },
      timezone: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'UTC',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Preferences');
  },
};
