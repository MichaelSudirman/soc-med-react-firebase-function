const { admin, db } = require("./admin");

// fbauth = firebase auth
// checks for header authentication (for JWT token checking?)
module.exports = (req, res, next) => {
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
      console.log(req)
      return next();
    })
    .catch(err => {
      console.error(`Error while verifying token`, err);
      return res.status(403).json(err);
    });
};
