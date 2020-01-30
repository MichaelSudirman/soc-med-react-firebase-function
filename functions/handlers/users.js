const { db } = require("../util/admin");

const config = require("../util/config");

const firebase = require("firebase");
firebase.initializeApp(config);

const { validateSignupData, validateLoginData } = require("../util/validators");

exports.signup = (req, res) => {
  // newUser will be stored in firebase authentication
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  // error handling
  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return res.status(400).json(errors);

  // TODO: validate data
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        // status 400 = bad request
        return res.status(400).json({
          handle: "this handle is already taken"
        });
      } else {
        // returns data authentication
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      /*
          the uid in firebase authentication cannot be linked to firebase database
          thus, idToken will be manually inserted to the database as follows
        */
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      // userCredentials will be stored in firebase database
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      };
      // return the response JWT token
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      // catch default firebase error handling and convert into our error
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already is in use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  // error handling
  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);
  
  
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({ token });
    })
    .catch(err => {
      console.error(err);
      // catch default firebase error handling and convert into our error
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again" });
      } else return res.status(500).json({ error: err.code });
    });
};
