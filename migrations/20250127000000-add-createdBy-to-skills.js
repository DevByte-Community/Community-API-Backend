'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Skills', 'createdBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });

    // Add index on createdBy for better query performance
    await queryInterface.addIndex('Skills', ['createdBy'], {
      name: 'skills_createdBy_idx',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeIndex('Skills', 'skills_createdBy_idx');
    await queryInterface.removeColumn('Skills', 'createdBy');
  },
};
