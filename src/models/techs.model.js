'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Tech extends Model {
        static associate(_models) { }
    }

    Tech.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        icon: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
    },
        {
            sequelize,
            modelName: 'Tech',
            tableName: 'Techs',
            timestamps: true,
        }
    );
    return Tech;
};