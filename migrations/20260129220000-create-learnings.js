'use strict';
const { LEARNING_LEVEL_VALUES } = require('../src/constants/learningConstants');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Learnings', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      content_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      level: {
         type: Sequelize.ENUM(...LEARNING_LEVEL_VALUES),
        allowNull: false,
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

    await queryInterface.addIndex('Learnings', ['user_id'], {
      name: 'learnings_userId_idx',
    });

    await queryInterface.addIndex('Learnings', ['name'], {
      name: 'learnings_name_idx',
    });

    await queryInterface.addIndex('Learnings', ['level'], {
      name: 'learnings_level_idx',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeIndex('Learnings', 'learnings_user_id_idx');
    await queryInterface.removeIndex('Learnings', 'learnings_name_idx');
    await queryInterface.removeIndex('Learnings', 'learnings_level_idx');
    
    await queryInterface.dropTable('Learnings');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Learnings_level";'
    );
  },
};