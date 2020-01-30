const functions = require("firebase-functions");

// initialize express
const app = require("express")();

const FBAuth = require("./util/fbAuth");

const { getAllScreams, postOneScream } = require("./handlers/screams");
const { signup, login, uploadImage } = require("./handlers/users");

// scream routes
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream);

// users routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);

// https://baseurl.com/api/scream <- /api/ is good practice
// https://api.baseurl.com/scream <- good practice alternative
exports.api = functions.https.onRequest(app);
