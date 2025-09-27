'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Rename column "name" → "fullname"
    await queryInterface.renameColumn('Users', 'name', 'fullname');

    // 2. Remove old "roles" column
    await queryInterface.removeColumn('Users', 'roles');

    // 3. Add new "role" ENUM column
    await queryInterface.addColumn('Users', 'role', {
      type: Sequelize.ENUM('USER', 'ADMIN'),
      allowNull: false,
      defaultValue: 'USER'
    });
  },

  async down(queryInterface, Sequelize) {
    // rollback: rename "fullname" back to "name"
    await queryInterface.renameColumn('Users', 'fullname', 'name');

    // drop new role column
    await queryInterface.removeColumn('Users', 'role');

    // re-add old roles array column
    await queryInterface.addColumn('Users', 'roles', {
      type: Sequelize.ARRAY(Sequelize.ENUM('USER', 'ADMIN')),
      defaultValue: ['USER']
    });
  }
};
