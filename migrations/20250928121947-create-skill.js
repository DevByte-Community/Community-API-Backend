'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Skills', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
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

    // Add unique index on name
    await queryInterface.addIndex('Skills', ['name'], {
      name: 'skills_name_idx',
      unique: true,
    });

    // Add index on createdBy for better query performance
    await queryInterface.addIndex('Skills', ['createdBy'], {
      name: 'skills_createdBy_idx',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeIndex('Skills', 'skills_name_idx');
    await queryInterface.dropTable('Skills');
  },
};
