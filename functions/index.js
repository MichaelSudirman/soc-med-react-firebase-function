const functions = require('firebase-functions');
const admin = require('firebase-admin')

// project already know the id from .firebaserc
admin.initializeApp();

// initialize express and app
const express = require('express');
const app = express();

app.get('/screams', (req, res) => {
    admin
        .firestore()
        .collection('screams')
        .orderBy('createdAt','desc')
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
                    createdAt:doc.data().createdAt
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

    admin
        .firestore()
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

// https://baseurl.com/api/scream <- /api/ is good practice
// https://api.baseurl.com/scream <- good practice alternative

exports.api = functions.https.onRequest(app);