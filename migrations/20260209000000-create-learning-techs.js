'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('LearningTechs', {
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            learningId: {
                type: Sequelize.UUID,
                primaryKey: true,
                references: {
                    model: 'Learnings',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
            techId: {
                type: Sequelize.UUID,
                primaryKey: true,
                references: {
                    model: 'Techs',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },
        });

        // Add indexes for performance
        await queryInterface.addIndex('LearningTechs', ['learningId']);
        await queryInterface.addIndex('LearningTechs', ['techId']);
    },

    async down(queryInterface, _Sequelize) {
        await queryInterface.dropTable('LearningTechs');
    },
};
