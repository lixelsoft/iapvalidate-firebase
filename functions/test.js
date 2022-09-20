const { logger } = require('firebase-functions/v1');
const reward = require('./keys/reward');





// let productId = "com.lixelsoft.dotrun.welcome";
// let rewardList = reward[productId];

// rewardList.forEach(element => {
//   console.log(element);
//   let postbox = {
//     Created: admin.firestore.FieldValue.serverTimestamp(),
//     Title: element.Title,
//     Type: element.Type,
//     Amount: element.Amount,
//     Expired: 10000000,
//   }

// });


var parseReceipt = JSON.parse("{\"Test\":12}");
console.log(parseReceipt);