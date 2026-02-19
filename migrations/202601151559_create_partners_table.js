'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('partners', {
      id: { type: Sequelize.STRING, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
      description: { type: Sequelize.STRING, allowNull: false },
      logo: { type: Sequelize.STRING },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE },
      updated_at: { type: Sequelize.DATE },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('partners');
  },
};
