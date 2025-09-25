'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserSkills', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users', // name of the target table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      skillId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Skills', // name of the target table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    //add unique constraint to prevent duplicate pairs
    await queryInterface.addConstraint('UserSkills', {
      fields: ['userId', 'skillId'],
      type: 'unique',
      name: 'unique_user_skill_pair',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UserSkills');
  },
};
