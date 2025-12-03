'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserSkills', {
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        primaryKey: true,
      },
      skillId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Skills',
          key: 'id',
        },
        onDelete: 'CASCADE',
        primaryKey: true,
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

    // Add composite unique index to prevent duplicate user-skill pairs
    await queryInterface.addIndex('UserSkills', ['userId', 'skillId'], {
      name: 'user_skills_userId_skillId_idx',
      unique: true,
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeIndex('UserSkills', 'user_skills_userId_skillId_idx');
    await queryInterface.dropTable('UserSkills');
  },
};
