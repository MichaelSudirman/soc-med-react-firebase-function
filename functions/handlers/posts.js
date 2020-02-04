const { db } = require("../util/admin");

exports.getAllPosts = (req, res) => {
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let posts = [];
      data.forEach(doc => {
        posts.push({
          postId: doc.id,
          // ...doc.data() is not compatible in firebase [Node 6]
          // rewrite all 6 data
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage
        });
      });
      return res.json(posts);
    })
    .catch(err => console.error(err));
};

// Post one post
exports.postOnePost = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newPost = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  db.collection("posts")
    .add(newPost)
    .then(doc => {
      const resPost = newPost;
      resPost.postId = doc.id;
      res.json(resPost);
    })
    .catch(err => {
      // change status from 200 to 500 -> indicates server error
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
};

// fetch one post with details
exports.getPost = (req, res) => {
  let postData = {};
  db.doc(`/posts/${req.params.postId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post not found" });
      }
      postData = doc.data();
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("postId", "==", req.params.postId)
        .get();
    })
    .then(data => {
      postData.comments = [];
      data.forEach(doc => {
        postData.comments.push({
          // ...doc.data(), commentId: doc.id in old versions of database
          // added feature that commentId is now shown
          postId: doc.data().postId,
          commentId: doc.id,
          userImage: doc.data().userImage,
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle
        });
        // postData.id.push(doc.id);
      });
      return res.json(postData);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// comment on a post
exports.commentOnPost = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ error: "Must not be empty" });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    postId: req.params.postId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };

  db.doc(`/posts/${req.params.postId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post not found" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: "Something went wrong" });
    });
};

/*
  delete comment from a post.
  Using snapshot to reduce postId param.
  Might need to replace onSnapshot() to be more cleanm
  with then() and catch() chain function
*/
exports.deleteComment = (req, res) => {
  db.collection("comments")
    .onSnapshot(snapshot => {
      let snapshotResult = {};
      snapshot.forEach(comment => {
        if (comment.id === req.params.commentId) {
          snapshotResult = { exists: true, postId: comment.data().postId };
        }
      });
      if (snapshotResult.exists) {
        if (doc.data().userHandle !== req.user.handle) {
          return res.status(403).json({ error: "Unauthorized" });
        }
        db.doc(`/comments/${req.params.commentId}`).delete();
        const postDocument = db.doc(`/posts/${snapshotResult.postId}`);
        postDocument
          .get()
          .then(doc => {
            postData = doc.data();
            postDocument.update({ commentCount: --postData.commentCount });
            return res.json({ data: postData });
          })
          .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.code });
          });
      } else {
        return res
          .status(400)
          .json({ error: "Your specified comment does not exists" });
      }
    });
};

/*
  delete comment from a post (DEPRECATED)
  deprecated function, does not need to have a postId param.
  might need to use again in case of needing postId param.
*/
exports.uncommentOnPost = (req, res) => {
  db.collection("comments")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.postId)
    .onSnapshot(snapshot => {
      let snapshotResult = {};
      snapshot.forEach(comment => {
        if (comment.id === req.params.commentId) {
          snapshotResult = { exists: true, postId: comment.data().postId };
        }
      });
      if (snapshotResult.exists) {
        db.doc(`/comments/${req.params.commentId}`).delete();
        const postDocument = db.doc(`/posts/${snapshotResult.postId}`);
        postDocument
          .get()
          .then(doc => {
            postData = doc.data();
            postDocument.update({ commentCount: --postData.commentCount });
            return res.json({ data: postData });
          })
          .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.code });
          });
      } else {
        return res
          .status(400)
          .json({ error: "Your specified comment does not exists" });
      }
    });
};

// like a post
exports.likePost = (req, res) => {
  // check for like and post document to exist
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.postId)
    .limit(1);

  const postDocument = db.doc(`/posts/${req.params.postId}`);
  let postData;

  postDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Post not found" });
      }
    })
    .then(data => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            postId: req.params.postId,
            userHandle: req.user.handle
          })
          .then(() => {
            postData.likeCount++;
            return postDocument.update({ likeCount: postData.likeCount });
          })
          .then(() => {
            return res.json(postData);
          });
      } else {
        return res.status(400).json({ error: "Post already liked" });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unlikePost = (req, res) => {
  // check for like and post document to exist
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.postId)
    .limit(1);

  const postDocument = db.doc(`/posts/${req.params.postId}`);
  let postData;

  postDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Post not found" });
      }
    })
    .then(data => {
      if (data.empty) {
        return res.status(400).json({ error: "Post have not been liked" });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            postData.likeCount--;
            return postDocument.update({ likeCount: postData.likeCount });
          })
          .then(() => {
            res.json(postData);
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// delete a post
exports.deletePost = (req, res) => {
  const document = db.doc(`/posts/${req.params.postId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post not found" });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Post deleted successfully" });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: error.code });
    });
};
