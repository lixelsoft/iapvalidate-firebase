

const admin = require('firebase-admin');
const iapKey = require('../keys/iapKey')
const firestoreKey = require('../keys/firestoreKey')
const iap = require('in-app-purchase');
admin.initializeApp({
  credential: admin.credential.cert(firestoreKey),
  databaseURL: "https://dotrun-ea4db-default-rtdb.firebaseio.com"
});

iap.config({
  googleServiceAccount: {
    clientEmail: iapKey.client_email,
    privateKey: iapKey.private_key
  },
  test: false, // For Apple and Googl Play to force Sandbox validation only
  verbose: false // Output debug logs to stdout stream
});

module.exports = {

  validateFirebaseIdToken: async (req, res, next) => {
    // functions.logger.log('Check if request is authorized with Firebase ID token');
  
    if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
        !(req.cookies && req.cookies.__session)) {
      // functions.logger.error(
      //   'No Firebase ID token was passed as a Bearer token in the Authorization header.',
      //   'Make sure you authorize your request by providing the following HTTP header:',
      //   'Authorization: Bearer <Firebase ID Token>',
      //   'or by passing a "__session" cookie.'
      // );
      res.status(403).send('Unauthorized');
      return;
    }
  
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      // functions.logger.log('Found "Authorization" header');
      // Read the ID Token from the Authorization header.
      idToken = req.headers.authorization.split('Bearer ')[1];
    } else if(req.cookies) {
      // functions.logger.log('Found "__session" cookie');
      // Read the ID Token from cookie.
      idToken = req.cookies.__session;
    } else {
      // No cookie
      res.status(403).send('Unauthorized');
      return;
    }
  
    try {
      const decodedIdToken = await admin.auth().verifyIdToken(idToken);
      // functions.logger.log('ID Token correctly decoded', decodedIdToken);
      req.user = decodedIdToken;
      next();
      return;
    } catch (error) {
      // functions.logger.error('Error while verifying Firebase ID token:', error);
      res.status(403).send('Unauthorized');
      return;
    }
  },

  
  googleReceiptValidate: function (req, res, next) {
    let data = {
      ...req.body
    }

    if(data.receipt == null) {
      res.status(403).send('Fail validate receipts...');
      return;
    }

    iap.setup()
      .then(() => {
        iap.validate(data.receipt)
          .then((validatedData) => {
            res.status(200).json();
          })
          .catch((error) => {
            console.log(error);
            res.status(403).send('Fail validate receipts...');
          });
      })
      .catch((error) => {
        // error...
        console.log(error);
        res.status(403).send('Error validate receipts...');
      });

  },


  // TODO: Apple 영수증 검증 구현해야함.
  appleReceiptValidate: function (req, res, next) {
    console.log(iapKey);
    res.status(200).json({
      Message: "appleReceiptValidate Success !!"
    });

  },


}