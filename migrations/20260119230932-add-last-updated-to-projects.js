'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Projects', 'lastUpdated', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('Projects', ['lastUpdated'], {
      name: 'projects_last_updated_idx',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('Projects', 'projects_last_updated_idx');
    await queryInterface.removeColumn('Projects', 'last_updated');
  },
};
