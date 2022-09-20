
const admin = require('firebase-admin');
const firestoreKey = require('../keys/firestoreKey');
const reward = require('../keys/reward');

admin.initializeApp({
  credential: admin.credential.cert(firestoreKey),
});
let rewardList = reward["com.lixelsoft.dotrun.palacedistancepath"];

var batch = admin.firestore().batch();
let uuid = "1kxwagdAwkM0TlMbvqfxLuB7Ib23";
rewardList.forEach(element => {
  let postbox = {
    Created: admin.firestore.FieldValue.serverTimestamp(),
    Title: element.Title,
    Type: element.Type,
    Amount: element.Amount,
    Expired: 10000000,
  }

  batch.update(admin.firestore().collection(`Users/${uuid}/Postbox`).doc(), postbox, {merge: true});
});

// * 계정당 1회성 구매 아이템 구매 완료.
batch.update(admin.firestore().collection(`Users/${uuid}/Info`).doc("IapOneTimeProductId"), {
  ["palacedistancepath"] : true,
});

// let collectionName = req.platform == GOOGLE ? IAP_REWARDED_ORDERID : IAP_IOS_REWARDED_ORDERID;
// batch.set(admin.firestore().collection(collectionName).doc(req.validatedData.orderId), {
//   uuid: req.uuid,
//   ...req.validatedData
// });


batch.commit().then(() => {
  console.log("Success");
  // res.status(200).send({result: true, message: "Sending reward is successful!", error: null});
})
.catch(error => {
  console.log("Error Sending reward...");
  // res.status(403).send({result: false, message: `Error Sending Onetime Package ${req.splitProductId} reward rewarded...`, error: error});
});
