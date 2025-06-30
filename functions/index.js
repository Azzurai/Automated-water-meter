// functions/index.js (FINAL version for asia-southeast1)

const { onValueCreated } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();
const firestore = admin.firestore();

// This is the main logic that will run when the function is triggered
const aggregateData = (event) => {
  const readingData = event.data.val();
  const meterId = event.params.meterId;

  console.log(`New reading for meter ${meterId}:`, readingData);

  if (!readingData.value || !readingData.timestamp) {
    console.log("Reading data is incomplete. Exiting function.");
    return null;
  }

  const waterUsed = readingData.value;
  const date = new Date(readingData.timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JS months are 0-11
  const day = date.getDate();

  const docId = `${meterId}-${year}-${month}-${day}`;
  const dailyUsageRef = firestore.collection("daily_usage").doc(docId);

  return firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(dailyUsageRef);

    if (!doc.exists) {
      transaction.set(dailyUsageRef, {
        meterId: meterId,
        totalUsage: waterUsed,
        year: year,
        month: month,
        day: day,
        date: admin.firestore.Timestamp.fromDate(new Date(year, month - 1, day)),
      });
    } else {
      const newTotalUsage = doc.data().totalUsage + waterUsed;
      transaction.update(dailyUsageRef, { totalUsage: newTotalUsage });
    }
  }).then(() => {
    console.log(`Successfully updated daily usage for ${docId}`);
  }).catch((error) => {
    console.error("Transaction failed:", error);
  });
};


// This is what we export. Notice the region is now correctly set.
exports.aggregateWaterUsage = onValueCreated(
  {
    ref: "/meter_readings/{meterId}/{readingId}",
    region: "asia-southeast1", // Your specific database location
  },
  aggregateData
);