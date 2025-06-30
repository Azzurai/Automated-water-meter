// === DASHBOARD.JS (FINAL FULL VERSION with UID DEBUGGING) ===

const auth = firebase.auth();
const db = firebase.database();

// A global variable to hold the chart instance so we can destroy it before re-drawing
var myUsageChart;

// Main logic that runs when the page loads and user login state is confirmed
auth.onAuthStateChanged(user => {
    if (!user) {
        // If no user is signed in, redirect them to the login page.
        window.location.href = "login.html";
        return; // Stop the script from running further
    }

    // === THE MOST IMPORTANT DEBUGGING STEP IS HERE ===
    // This line will print the User ID (UID) of the account you are ACTUALLY logged into.
    // We need to find this message in the browser console.
    console.log("THE UID OF THE CURRENTLY LOGGED-IN USER IS:", user.uid);
    // ===========================================

    // Update the welcome message on the page with the user's email
    document.getElementById("userEmail").innerText = user.email;

    // Now, let's get this specific user's profile from the database to find their meterId
    const userProfileRef = db.ref("users/" + user.uid);

    userProfileRef.once("value").then(snapshot => {
        
        console.log("The code received this user profile from the database:", snapshot.val());

        const userData = snapshot.val();
        
        // This is where the code checks if the profile exists AND has a 'meterId' field.
        // If either is missing, it will trigger the alert.
        if (!userData || !userData.meterId) {
            console.error("The code looked for 'meterId' but didn't find it in the profile shown above. Make sure you are editing the correct user in the Firebase Database.");
            alert("Error: Your account is not linked to a water meter. Please check your Firebase Database and ensure the user with the UID shown in the console has a 'meterId' field.");
            return; // Stop the script
        }
        
        // Success! The meterId was found. Now we can proceed.
        const meterId = userData.meterId;
        const usageRef = db.ref("meter_readings/" + meterId);
        
        // Use '.on()' to listen for data in real-time, so the chart updates automatically.
        usageRef.on("value", (dataSnapshot) => {
            const rawReadings = dataSnapshot.val();

            if (!rawReadings) {
                console.log("The meter with ID '" + meterId + "' has successfully connected, but has no readings yet.");
                document.getElementById("liters").innerText = "0.00";
                document.getElementById("price").innerText = "0.00";
                return; // Nothing more to do
            }

            const dailyData = aggregateReadingsByDay(rawReadings);
            const totalLiters = Object.values(dailyData).reduce((sum, value) => sum + value, 0);

            // Make the daily data available to functions in extras.js (for PDF/CSV)
            window.dailyUsageGlobal = dailyData;

            // Update the display on the web page
            document.getElementById("liters").innerText = totalLiters.toFixed(2);
            document.getElementById("price").innerText = calculateTieredPrice(totalLiters);
            
            // Call the function from extras.js to draw the chart
            updateChart(dailyData);
        });

    }).catch(error => {
        // This catches errors like "Permission Denied" if the database rules are wrong.
        console.error("Firebase database error when fetching user profile:", error);
        alert("A database error occurred while fetching your profile. Check the console for details.");
    });
});

// === ALL HELPER FUNCTIONS ===

// Function to sign the user out. It is safe to have this here and in admin-dashboard.js.
function logout() {
  auth.signOut().then(() => {
    window.location.href = "login.html";
  });
}

// Function that groups the many small sensor readings into daily totals
function aggregateReadingsByDay(readings) {
    const dailyUsage = {};
    Object.values(readings).forEach(reading => {
        const date = new Date(reading.timestamp);
        // Format the date into a 'YYYY-MM-DD' string to use as a unique key for each day
        const dayKey = date.toISOString().split('T')[0];
        // If a day doesn't exist in our object, initialize it to 0, then add the current reading's value
        dailyUsage[dayKey] = (dailyUsage[dayKey] || 0) + reading.value;
    });
    return dailyUsage;
}

// Function to calculate the bill based on tiered pricing
function calculateTieredPrice(totalLiters) {
  const totalM3 = totalLiters / 1000.0;
  let price = 0;
  if (totalM3 <= 20) {
    price = totalM3 * 0.57;
  } else if (totalM3 <= 35) {
    price = (20 * 0.57) + ((totalM3 - 20) * 1.03);
  } else {
    price = (20 * 0.57) + (15 * 1.03) + ((totalM3 - 35) * 2.00);
  }
  return price.toFixed(2);
}