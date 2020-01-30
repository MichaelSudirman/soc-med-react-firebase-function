const functions = require("firebase-functions");
const admin = require("firebase-admin");

// project already know the id from .firebaserc
admin.initializeApp();

// initialize express and app
const express = require("express");
const app = express();

// initialize firebase
const firebase = require("firebase");
const firebaseConfig = {
  apiKey: "AIzaSyApgLjRjuC6L1bbLP7BWT1RXq2oucZ1q5g",
  authDomain: "soc-med.firebaseapp.com",
  databaseURL: "https://soc-med.firebaseio.com",
  projectId: "soc-med",
  storageBucket: "soc-med.appspot.com",
  messagingSenderId: "378654173438",
  appId: "1:378654173438:web:c0a760f8d37bb775f15daf",
  measurementId: "G-9V75C90226"
};
firebase.initializeApp(firebaseConfig);

// rename db for clean code
const db = admin.firestore();

app.get("/screams", (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let screams = [];
      data.forEach(doc => {
        screams.push({
          screamId: doc.id,
          // ...doc.data() is not compatible in firebase [Node 6]
          // rewrite all 3 data
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt
        });
      });
      return res.json(screams);
    })
    .catch(err => console.error(err));
});

// fbauth = firebase auth
// checks for header authentication (for JWT token checking?)
const FBAuth = (req, res, next) => {
  let idToken;
  // Error handling for checking if there is no/adnormal header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    // ...split('Bearer ')[0] will return Bearer
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Verify that the token is from the server and not from somewhere else
  admin
    .auth()
    .verifyIdToken(idToken)
    .then(decodedToken => {
      /*
            decodedToken holds the data that is inside the token,
            and passed to the next function after FBAuth().
            Typical convention to pass decodedToken and userId property
            from the collection of users under firebase authentication section
            to the database section manually
       */
      req.user = decodedToken;
      console.log(decodedToken);
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
      /*    
            returned data is in array form, eventhough where() and limit() is used,
            thus will take the first array regardless,
            then proceeds to the next function carrying needed auth data
        */
      req.user.handle = data.docs[0].data().handle;
      return next();
    })
    .catch(err => {
      console.error(`Error while verifying token`, err);
      return res.status(403).json(err);
    });
};

// post one scream
app.post("/scream", FBAuth, (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }
  // catch any client error(400) that give GET request
  //   if (req.method !== "POST") {
  //     return res.status(400).json({ error: "Method not allowed" });
  //   }

  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString()
  };

  db.collection("screams")
    .add(newScream)
    .then(doc => {
      res.json({ message: `document ${doc.id} created successfully` });
    })
    .catch(err => {
      // change status from 200 to 500 -> indicates server error
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
});

// helper function for checking empty and is email
const isEmpty = string => {
  if (string.trim() === "") return true;
  else return false;
};
const isEmail = email => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};

// Signup route
app.post("/signup", (req, res) => {
  // newUser will be stored in firebase authentication
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  // error handling
  let errors = {};
  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email address";
  }

  if (isEmpty(newUser.password)) errors.password = "Must not be empty";
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "Passwords must match";
  if (isEmpty(newUser.handle)) errors.handle = "Must not be empty";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

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
});

app.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  // error handling
  let errors = {};

  if (isEmpty(user.email)) errors.email = "Must not be empty";
  if (isEmpty(user.password)) errors.password = "Must not be empty";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

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
});

// https://baseurl.com/api/scream <- /api/ is good practice
// https://api.baseurl.com/scream <- good practice alternative
exports.api = functions.https.onRequest(app);
