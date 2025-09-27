'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('UserSkills', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
    });
    await queryInterface.changeColumn('UserSkills', 'skillId', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('UserSkills', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn('UserSkills', 'skillId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
