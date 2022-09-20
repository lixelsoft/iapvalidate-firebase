
'use strict'

const admin = require('firebase-admin');
const crypto = require('crypto');
const http = require('http');
const iap = require('in-app-purchase');
const iapKey = require('../keys/iapKey');
const reward = require('../keys/reward');
const firestoreKey = require('../keys/firestoreKey');

const IAP_REWARDED_ORDERID = "IapRewardedOrderId";
const IAP_IOS_REWARDED_ORDERID = "IapIOSRewardedOrderId";


const GOOGLE = "GOOGLE";
const APPLE = "APPLE";
// const USERS = "Users";

admin.initializeApp({
  credential: admin.credential.cert(firestoreKey),
  // databaseURL: "https://dotrun-ea4db-default-rtdb.firebaseio.com"
});

iap.config({

  /* Configurations for Apple */
  appleExcludeOldTransactions: false, // if you want to exclude old transaction, set this to true. Default is false
  applePassword: '3cd0ab526e2345d5bb1a6e7bc0171bf9', // this comes from iTunes Connect (You need this to valiate subscriptions)

  googleServiceAccount: {
    clientEmail: iapKey.client_email,
    privateKey: iapKey.private_key
  },

  // ! TODO: Change
  test: false, // For Apple and Googl Play to force Sandbox validation only
  // test: true, // For Apple and Googl Play to force Sandbox validation only
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
      res.status(403).send({status: 403, result: false, message: "Unauthorized, Bearer failed"});
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
      res.status(403).send({status: 403, result: false, message: "Unauthorized, No cookie"});
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
      let msg = `Unauthorized, Firebase ID Token Error: ${error}`;
      res.status(403).send({result: false, message: msg});
      return;
    }
  },

  unityTestValidate: function(req, res, next) {

    let data = {
      ...req.body
    }

    req.uuid = data.UUID;
    req.receipt = {
      packageName : data.PackageName,
      productId: data.ProductId,
      purchaseToken : data.PurchaseToken
    }
    req.doubleAmount = true;
    req.splitProductId = req.receipt.productId.split('.').pop();


    next();
  },
  
  googleReceiptValidate: function (req, res, next) {
    let data = {
      ...req.body
    }

    req.uuid = data.UUID;
    req.platform = GOOGLE;
    req.receipt = {
      packageName : data.PackageName,
      productId: data.ProductId,
      purchaseToken : data.PurchaseToken
    }

    if(req.receipt.packageName == null || req.receipt.productId == null || req.receipt.purchaseToken == null) {
      res.status(403).send({result: false, message: "Receipt is null", error: null});
      return;
    }

    iap.setup()
      .then(() => {
        iap.validate(req.receipt)
          .then((validatedData) => {
            console.log(validatedData);
            req.validatedData = validatedData;
            next();
          })
          .catch((error) => {
            console.log(error);
            res.status(403).send({result: false, message: "IAP Validation error", error: error});
          });
      })
      .catch((error) => {
        // error...
        console.log(error);
        let msg = `IAP Setup error`;
        res.status(403).send({result: false, message: msg, error: error});
      });
  },



  // * Apple Receipts Validator * //
  appleReceiptValidate: function (req, res, next) {

    let data = {
      ...req.body
    }

    req.uuid = data.UUID;
    req.platform = APPLE;
    req.transactionID = data.TransactionID;
    req.receipt = {
      productId: data.ProductId,
      // packageName : data.PackageName,
      // purchaseToken : data.PurchaseToken
    }

    if(req.receipt.productId == null) {
      res.status(403).send({result: false, message: "Receipt is null", error: null});
      return;
    }

    iap.setup()
      .then(() => {
        iap.validate(data.AppleReceipt)
          .then((validatedData) => {
            console.log("Success IOS Receipts validate");
            console.log(validatedData);
            // req.receipt = validatedData.receipt;
            req.validatedData = {};
            req.validatedData = validatedData;
            req.validatedData.orderId = data.TransactionID;
            console.log("***********");
            console.log(req.TransactionID);
            console.log(req.validatedData.orderId);
            next();
          })
          .catch((error) => {
            console.log(error);
            res.status(403).send({result: false, message: "IAP Validation error", error: error});
          });
      })
      .catch((error) => {
        // error...
        console.log(error);
        let msg = `IAP Setup error`;
        res.status(403).send({result: false, message: msg, error: error});
      });

  },

  checkOnetimePackage: async(req, res, next) => {

    admin.firestore().collection(`Users/${req.uuid}/Info`).doc("IapOneTimeProductId").get().then((querySnapshot) => {
      let data = querySnapshot.data();
      console.log(data);
      req.splitProductId = req.receipt.productId.split('.').pop();
      let purchased = data[req.splitProductId];
      console.log("purchased : " + purchased);
      if(purchased) {
        res.status(403).send({result: false, message: `Already Purchased ${req.splitProductId}`});
      } else {
        next();
      }
    });


  },

  checkFreePackage: async(req, res, next) => {

    let data = {
      ...req.body
    }

    req.uuid = data.UUID;
    req.receipt = {
      packageName : data.PackageName,
      productId: data.ProductId,
      purchaseToken : data.PurchaseToken
    }

    admin.firestore().collection(`Users/${req.uuid}/Info`).doc("IapOneTimeProductId").get().then((querySnapshot) => {
      let data = querySnapshot.data();
      console.log(data);
      req.splitProductId = req.receipt.productId.split('.').pop();
      let purchased = data[req.splitProductId];
      console.log("purchased : " + purchased);
      if(purchased) {
        res.status(403).send({result: false, message: `Already Purchased ${req.splitProductId}`});
      } else {
        next();
      }
    });
  },

  SendFreePackage: async(req, res, next) => {

    var batch = admin.firestore().batch();
    console.log(req.receipt.productId);
    let rewardList = reward[req.receipt.productId];
    console.log(rewardList);

    rewardList.forEach(element => {
      let postbox = {
        Created: admin.firestore.FieldValue.serverTimestamp(),
        Title: element.Title,
        TitleText: element.TitleText == null ? "" : element.TitleText,
        Type: element.Type,
        Amount: element.Amount,
        Expired: 10000000,
      }

      batch.update(admin.firestore().collection(`Users/${req.uuid}/Postbox`).doc(), postbox, {merge: true});
    });

    // * 계정당 1회성 구매 아이템 구매 완료.
    batch.update(admin.firestore().collection(`Users/${req.uuid}/Info`).doc("IapOneTimeProductId"), {
      [`${req.splitProductId}`] : true,
    });

    // let collectionName = req.platform == GOOGLE ? IAP_REWARDED_ORDERID : IAP_IOS_REWARDED_ORDERID;
    // batch.set(admin.firestore().collection(collectionName).doc(req.validatedData.orderId), {
    //   uuid: req.uuid,
    //   ...req.validatedData
    // });

    batch.commit().then(() => {
      res.status(200).send({result: true, message: "Sending reward is successful!", error: null});
    })
    .catch(error => {
      console.log("Error Sending reward...");
      res.status(403).send({result: false, message: `Error Sending Onetime Package ${req.splitProductId} reward rewarded...`, error: error});
    });


  },



  checkRewardedReceipt: async(req, res, next) => {

    let collectionName = req.platform == GOOGLE ? IAP_REWARDED_ORDERID : IAP_IOS_REWARDED_ORDERID;
    console.log(collectionName);
    admin.firestore().collection(collectionName).doc(req.validatedData.orderId).get().then(doc => {
      if(doc.exists) {
        res.status(403).send({result: false, message: `Exist in RewadedOrderId ${req.validatedData.orderId}`});
      } else {
        next();
      }
    });
        
  },

  checkDoubleProduct: async(req, res, next) => {
    // if(!reward.iapDoubleProductId.includes(req.receipt.productId)) {
    //   next();
    //   return;
    // }
    // req.splitProductId = req.receipt.productId.split('.').pop();

    console.log("checkDoubleProduct");
    req.splitProductId = req.receipt.productId.split('.').pop();
    admin.firestore().collection(`Users/${req.uuid}/Info`).doc("IapDailyProductId").get().then((querySnapshot) => {
      if(!querySnapshot.exists) {
        console.log("checkDoubleProduct Fail...");
        res.status(403).send({result: false, message: `Not Exist User ${req.uuid}`});
      } else {
        console.log("checkDoubleProduct Success");
        let data = querySnapshot.data();
        console.log(req.splitProductId);
        let rewardedDate = data[req.splitProductId].toDate();
        // let today = new Date(Date.now());
  
        // let calcToday = today.getFullYear() + today.getMonth() + today.getDate();
        // let calcRubydate = rewardedDate.getFullYear() + rewardedDate.getMonth() + rewardedDate.getDate();
        // req.doubleAmount = calcToday != calcRubydate;
  
        // First Purchase Double Amount
        req.doubleAmount = rewardedDate.getFullYear() < 2000;
        console.log(`rewardedDate: ${rewardedDate}`);
        console.log(`Double: ${req.doubleAmount}`);
        next();

      }
    });
  },

  checkTodayExpired: async(req, res, next) => {
    // if(!reward.iapDoubleProductId.includes(req.receipt.productId)) {
    //   next();
    //   return;
    // }
    // req.splitProductId = req.receipt.productId.split('.').pop();

    console.log("checkDoubleProduct");
    req.splitProductId = req.receipt.productId.split('.').pop();
    admin.firestore().collection(`Users/${req.uuid}/Info`).doc("IapDailyProductId").get().then((querySnapshot) => {
      if(!querySnapshot.exists) {
        console.log("checkDoubleProduct Fail...");
        res.status(403).send({result: false, message: `Not Exist User ${req.uuid}`});
      } else {
        console.log("checkDoubleProduct Success");
        let data = querySnapshot.data();
        console.log(req.splitProductId);
        let rewardedDate = data[req.splitProductId].toDate();
        let today = new Date();
        // let today = new Date(Date.now());
  
        // let calcToday = today.getFullYear() + today.getMonth() + today.getDate();
        // let calcRubydate = rewardedDate.getFullYear() + rewardedDate.getMonth() + rewardedDate.getDate();
        // req.doubleAmount = calcToday != calcRubydate;
  
        // First Purchase Double Amount
        let a = rewardedDate.getFullYear() + rewardedDate.getMonth() + rewardedDate.getDate();
        let b = today.getFullYear() + today.getMonth() + today.getDate();
        req.expiredToday = a == b;

        console.log(`rewardedDate: ${rewardedDate}, today: ${today}`);
        console.log(`a: ${a}, b: ${b}`);
        console.log(`expiredToday: ${req.expiredToday}`);

        next();

      }
    });
  },

  sendCurrencyReward: async (req, res, next) => {
    console.log("sendCurrencyReward");
    // * Currency Item
    let postbox = {
      Created: admin.firestore.FieldValue.serverTimestamp(),
      // Title: req.doubleAmount ? reward[req.receipt.productId].Title + 10 : reward[req.receipt.productId].Title,
      Title: reward[req.receipt.productId].Title,
      Type: reward[req.receipt.productId].Type,
      Amount: req.doubleAmount ? reward[req.receipt.productId].Amount * 2 : reward[req.receipt.productId].Amount,
      Expired: 10000000,
    }

    var batch = admin.firestore().batch();
    batch.update(admin.firestore().collection(`Users/${req.uuid}/Postbox`).doc(), postbox, {merge: true});

    if(req.doubleAmount) {
      // Update double rewarded date
      batch.update(admin.firestore().collection(`Users/${req.uuid}/Info`).doc("IapDailyProductId"), {
        [`${req.splitProductId}`] : new Date(Date.now())
      });
    }

    let collectionName = req.platform == GOOGLE ? IAP_REWARDED_ORDERID : IAP_IOS_REWARDED_ORDERID;
    batch.set(admin.firestore().collection(collectionName).doc(req.validatedData.orderId ), {
      uuid: req.uuid,
      ...req.validatedData
    });

    batch.commit().then(() => {
      res.status(200).send({result: true, message: "Validation and reward are successful!", error: null});
    })
    .catch(error => {
      console.log("Error update reminder message to firestore...");
      res.status(403).send({result: false, message: `Validation is successful but faild to rewarded...`, error: error});
    });

  },

  sendOnetimePackage: async (req, res, next) => {
    // * Onetime Package Item
    console.log("Send Reward : " + req.receipt.productId);
    let rewardList = reward[req.receipt.productId];
    var batch = admin.firestore().batch();

    rewardList.forEach(element => {
      let postbox = {
        Created: admin.firestore.FieldValue.serverTimestamp(),
        Title: element.Title,
        Type: element.Type,
        Amount: element.Amount,
        Expired: 10000000,
      }

      batch.update(admin.firestore().collection(`Users/${req.uuid}/Postbox`).doc(), postbox, {merge: true});
    });

    // * 계정당 1회성 구매 아이템 구매 완료.
    batch.update(admin.firestore().collection(`Users/${req.uuid}/Info`).doc("IapOneTimeProductId"), {
      [`${req.splitProductId}`] : true,
    });

    let collectionName = req.platform == GOOGLE ? IAP_REWARDED_ORDERID : IAP_IOS_REWARDED_ORDERID;
    batch.set(admin.firestore().collection(collectionName).doc(req.validatedData.orderId), {
      uuid: req.uuid,
      ...req.validatedData
    });

    batch.commit().then(() => {
      res.status(200).send({result: true, message: "Sending reward is successful!", error: null});
    })
    .catch(error => {
      console.log("Error Sending reward...");
      res.status(403).send({result: false, message: `Error Sending Onetime Package ${req.splitProductId} reward rewarded...`, error: error});
    });

  },



  sendDailyPackage: async (req, res, next) => {
    if(req.expiredToday) {
      res.status(403).send({result: false, message: `Already Purchased...`, error: "Expired Today Purchase"});
      return;
    }

    // * Daily Package Item
    let rewardList = reward[req.receipt.productId];
    var batch = admin.firestore().batch();

    rewardList.forEach(element => {
      let postbox = {
        Created: admin.firestore.FieldValue.serverTimestamp(),
        Title: element.Title,
        Type: element.Type,
        Amount: element.Amount,
        Expired: 10000000,
      }

      batch.update(admin.firestore().collection(`Users/${req.uuid}/Postbox`).doc(), postbox, {merge: true});
    });

    batch.update(admin.firestore().collection(`Users/${req.uuid}/Info`).doc("IapDailyProductId"), {
      [`${req.splitProductId}`] : admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("splitProductId: " + req.splitProductId);


    let collectionName = req.platform == GOOGLE ? IAP_REWARDED_ORDERID : IAP_IOS_REWARDED_ORDERID;
    batch.set(admin.firestore().collection(collectionName).doc(req.validatedData.orderId ), {
      uuid: req.uuid,
      ...req.validatedData
    });

    batch.commit().then(() => {
      res.status(200).send({result: true, message: "Validation and reward are successful!", error: null});
    })
    .catch(error => {
      console.log("Error update reminder message to firestore...");
      res.status(403).send({result: false, message: `Validation is successful but faild to rewarded...`, error: error});
    });
  },









  testFail: function (req, res, next) {
    console.log(req.receipt);
    res.status(403).send({result: false, message: "Fail !!"});
  },


  testSuccess: function (req, res, next) {
    console.log("testSuccess");
    req.uuid = "XCS2bsiCU2OiQUOs57vkgoJPny32";
    req.orderId = "GPA.3397-7034-8821-18980";
    req.splitProductId = "com.lixelsoft.dotrun.ruby0";
    next();
    return;
  },


    
  testFunction: async (req, res, next) => {
    // if(!reward.iapDoubleProductId.includes(req.receipt.productId)) {
    //   next();
    //   return;
    // }

    // admin.firestore().collection("Users").doc(req.UUID).get().then((querySnapshot) => {
    //   let data = querySnapshot.data();
    //   req.splitProductId = req.receipt.productId.split('.').pop();
    //   let rewardedDate = data["IAPDailyDoubleProductId"][req.splitProductId].toDate();
      
    //   let today = new Date(Date.now());

    //   let calcToday = today.getFullYear() + today.getMonth() + today.getDate();
    //   let calcRubydate = rubyDate.getFullYear() + rubyDate.getMonth() + rubyDate.getDate();
    
    //   req.doubleEvent = calcToday != calcRubydate;
    //   next();
    // });



  },









}