'use strict';

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const { User, sequelize } = require('../src/models'); // adjust path if needed

/**
 * Bulk seed admin users from JSON file
 */
async function seedAdminUsers() {
  const transaction = await sequelize.transaction();

  try {
    console.log('Starting admin users seeding process...');

    // Read the JSON file
    const filePath = path.join(__dirname, 'data/adminUsers.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const usersData = JSON.parse(fileContent);

    console.log(`Found ${usersData.length} admin users to seed`);

    // Prepare data for bulk insert
    const preparedData = await Promise.all(
      usersData.map(async (user) => ({
        fullname: user.fullname,
        email: user.email,
        password: await bcrypt.hash(user.password, 10),
        role: user.role,
        created_at: new Date(),
        updated_at: new Date(),
      }))
    );

    // Use bulkCreate with ignoreDuplicates option
    const result = await User.bulkCreate(preparedData, {
      ignoreDuplicates: true,
      transaction,
    });

    await transaction.commit();

    console.log('\n=== Admin Users Seeding Summary ===');
    console.log(`Total users in file: ${usersData.length}`);
    console.log(`Successfully inserted: ${result.length}`);
    console.log(`Skipped (duplicates): ${usersData.length - result.length}`);
    console.log('===================================\n');

    return result;
  } catch (error) {
    await transaction.rollback();
    console.error('Fatal error during admin users seeding:', error);
    throw error;
  }
}

// Run the seeder if called directly
if (require.main === module) {
  seedAdminUsers()
    .then(() => {
      console.log('Admin users seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin users seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedAdminUsers;
