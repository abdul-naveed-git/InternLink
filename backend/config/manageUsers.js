const admin = require("../utils/firebaseAdminClient");

async function listAllUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);

    console.log("Users List:");
    listUsersResult.users.forEach((user) => {
      console.log(`UID: ${user.uid} | Email: ${user.email}`);
    });
  } catch (error) {
    console.error("Error listing users:", error);
  }
}

async function deleteUserByEmail(email) {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(userRecord.uid);
    console.log(`User deleted: ${email}`);
  } catch (error) {
    console.error("Error deleting user:", error.message);
  }
}

const action = process.argv[2];
const email = process.argv[3];

if (action === "list") {
  listAllUsers();
} else if (action === "delete" && email) {
  deleteUserByEmail(email);
} else {
  console.log(`
Usage:
  node manageUsers.js list
  node manageUsers.js delete user@example.com
  `);
}
