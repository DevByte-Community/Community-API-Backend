'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Skills', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users', 
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('Skills', {
      fields: [Sequelize.fn('lower', Sequelize.col('name'))],
      unique: true,
      name: 'idx_skills_name_unique_ci',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Skills');
  },
};
