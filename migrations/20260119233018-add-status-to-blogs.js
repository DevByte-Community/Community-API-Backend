
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Blogs', 'status', {
      type: Sequelize.ENUM('draft', 'published'),
      allowNull: false,
      defaultValue: 'draft',
    });

    await queryInterface.addIndex('Blogs', ['status'], {
      name: 'blog_status_idx',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('Blogs', 'blog_status_idx');
    await queryInterface.removeColumn('Blogs', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Blogs_status";');
  },
};