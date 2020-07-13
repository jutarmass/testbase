const functions = require('firebase-functions');
const app = require('express')();

const cors = require('cors');
app.use(cors());

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

app.get('/infos', (req, res) => {
  db.collection('infos')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let infos = [];
      data.forEach((doc) => {
        infos.push({
          infoId: doc.id,
          body: doc.data().body,
          createdAt: doc.data().createdAt
        });
      });
      return res.json(infos);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
});

app.get('/info/:infoId', (req, res) => {
  let info = {};
  db.doc(`/infos/${req.params.infoId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Info not found' });
      }
      info = doc.data();
      info.infoId = doc.id;
      return res.json(info);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
});

app.post('/info', (req, res) => {
  if (req.body.body.trim() === '') {
    return res.status(400).json({ body: 'Body must not be empty' });
  }

  const newInfo = {
    body: req.body.body,
    createdAt: new Date().toISOString()
  };

  db.collection('infos')
    .add(newInfo)
    .then((doc) => {
      const resInfo = newInfo;
      resInfo.infoId = doc.id;
      res.json(resInfo);
    })
    .catch((err) => {
      res.status(500).json({ error: 'something went wrong' });
      console.error(err);
    });
});

exports.api = functions.region('asia-east2').https.onRequest(app);

exports.createNotificationOnPostInfo = functions
  .region('asia-east2')
  .firestore.document('infos/{id}')
  .onCreate((change, context) => {
    functions.logger.log("createNotificationOnPostInfo trigger :", context.params.id);
    functions.logger.log("change.data():", change.data());
    return db
      .doc(`/infos/${context.params.id}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return db.doc(`/notifications/${context.params.id}`).set({
            createdAt: new Date().toISOString(),
            infoId: doc.id
          });
        }
      })
      .catch((err) => console.error(err));
  });