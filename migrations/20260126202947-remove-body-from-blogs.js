'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('Blogs', 'body');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('Blogs', 'body', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },
};
