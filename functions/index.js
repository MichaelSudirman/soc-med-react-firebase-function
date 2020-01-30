const functions = require('firebase-functions');
const admin = require('firebase-admin')

// project already know the id from .firebaserc
admin.initializeApp();


// initialize express and app
const express = require('express');
const app = express();

// initialize firebase
const firebase = require('firebase');
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
firebase.initializeApp(firebaseConfig)

// rename db for clean code
const db = admin.firestore();

app.get('/screams', (req, res) => {
    db
        .collection('screams')
        .orderBy('createdAt', 'desc')
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
})

app.post('/scream', (req, res) => {
    // Catch any client error(400) that give GET request
    if (req.method !== 'POST') {
        return res.status(400).json({ error: 'Method not allowed' });
    }

    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };

    db
        .collection('screams')
        .add(newScream)
        .then(doc => {
            res.json({ message: `document ${doc.id} created successfully` });
        })
        .catch(err => {
            // change status from 200 to 500 -> indicates server error 
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
        })
})

// Signup route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    }

    // TODO validate data

    firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password)
        .then(data => {
            // status 201 = resource created
            return res
                .status(201)
                .json({
                    message: `user ${data.user.uid} signed up successfully`
                })
                .catch(err => {
                    console.error(err);
                    // status 500 = server error
                    return res.status(500).json({
                        error: err.code
                    })
                })
        })
})

// https://baseurl.com/api/scream <- /api/ is good practice
// https://api.baseurl.com/scream <- good practice alternative
exports.api = functions.https.onRequest(app);