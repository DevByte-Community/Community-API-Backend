// models/resource.model.js
module.exports = (sequelize, DataTypes) => {
  const Resource = sequelize.define('Resource', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
    },
    url: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
  });

  return Resource;
};
