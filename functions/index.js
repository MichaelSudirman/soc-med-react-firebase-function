const functions = require("firebase-functions");

// initialize express
const app = require("express")();

const FBAuth = require("./util/fbAuth");

const { getAllScreams, postOneScream } = require("./handlers/screams");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser
} = require("./handlers/users");

// scream routes
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream);
// TODO get a scream with full details
// app.get("/scream/:screamId",getScream)
// TODO delete scream
// TODO like a scream
// TODO unlike a scream
// TODO comment on scream

// users routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);

// https://baseurl.com/api/scream <- /api/ is good practice
// https://api.baseurl.com/scream <- good practice alternative
exports.api = functions.https.onRequest(app);
