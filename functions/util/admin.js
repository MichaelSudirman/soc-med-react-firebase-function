const admin = require("firebase-admin");

// project already know the id from .firebaserc
admin.initializeApp();

// rename db for clean code
const db = admin.firestore();

module.exports = { admin, db };
