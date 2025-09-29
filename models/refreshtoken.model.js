// /models/RefreshToken.js
export default (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define("RefreshToken", {
    token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, { foreignKey: "userId" });
  };

  return RefreshToken;
};
