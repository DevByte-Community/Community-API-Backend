// models/job.model.js
module.exports = (sequelize, DataTypes) => {
  const Job = sequelize.define('Job', {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    // other fields... 
  });

  return Job;
};
