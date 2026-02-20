'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'lastActiveAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('Users', ['lastActiveAt'], {
      name: 'users_last_active_at_idx',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('Users', 'users_last_active_at_idx');
    await queryInterface.removeColumn('Users', 'lastActiveAt');
  },
};

