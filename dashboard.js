// === DASHBOARD.JS (PRESENTATION MODE - Triggers on NO FLOW) ===

const auth = firebase.auth();
const db = firebase.database();

// --- PRESENTATION NOTIFICATION CONFIGURATION ---
// We will now trigger if the flow is OFF for a certain time.
const NOTIFICATION_TRIGGER_COUNT = 5; // Readings to wait before triggering (5 readings * 2s = 10 seconds)
let zeroFlowCounter = 0; // The counter for consecutive zero-flow readings.
// ---

// Main auth listener
auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = "login.html"; return; }
    document.getElementById("userEmail").innerText = user.email;

    db.ref("users/" + user.uid).once("value").then(snapshot => {
        const userData = snapshot.val();
        if (!userData || !userData.meterId) {
            alert("Error: Your account is not linked to a meter.");
            return;
        }

        const meterId = userData.meterId;
        const usageRef = db.ref("meter_readings/" + meterId);
        
        usageRef.on("value", dataSnapshot => {
            const rawReadings = dataSnapshot.val();
            if (!rawReadings) { return; }

            const readingsArray = Object.values(rawReadings).sort((a, b) => a.timestamp - b.timestamp);
            const latestReading = readingsArray[readingsArray.length - 1];
            const currentFlowRate = latestReading.flowRate || 0;

            // ===============================================
            // === LOGIC FOR PRESENTATION DEMONSTRATION ======
            // ===============================================
            
            // Check if the flow rate is effectively zero.
            if (currentFlowRate < 0.01) {
                // If the water is OFF, increment the counter.
                zeroFlowCounter++;
                console.log(`Water is OFF. Notification counter at: ${zeroFlowCounter} / ${NOTIFICATION_TRIGGER_COUNT}`);
            } else {
                // If the water is ON (any flow), reset the counter and hide the notification.
                zeroFlowCounter = 0;
                hideLeakNotification();
            }
            
            // If the counter reaches our trigger count, show the alert.
            // This happens after the water has been OFF for the specified duration.
            if (zeroFlowCounter >= NOTIFICATION_TRIGGER_COUNT) {
                console.log("TRIGGER REACHED! Showing notification for presentation.");
                showLeakNotification();
            }

            // ===============================================
            // === END OF PRESENTATION LOGIC =================
            // ===============================================


            // Update the rest of the UI as normal
            const dailyData = aggregateReadingsByDay(rawReadings);
            const totalLiters = Object.values(dailyData).reduce((sum, val) => sum + val, 0);
            window.dailyUsageGlobal = dailyData;
            
            document.getElementById("flowRate").innerText = currentFlowRate.toFixed(2);
            document.getElementById("liters").innerText = totalLiters.toFixed(2);
            document.getElementById("price").innerText = calculateTieredPrice(totalLiters);
            updateChart(dailyData);
        });
    });
});

// --- HELPER FUNCTIONS ---
function showLeakNotification() {
    const notification = document.getElementById('leak-notification');
    if (notification) {
        notification.style.display = 'flex';
    }
}

function hideLeakNotification() {
    const notification = document.getElementById('leak-notification');
    if (notification) {
        notification.style.display = 'none';
    }
}

function aggregateReadingsByDay(readings) {
    const dailyData = {};
    Object.values(readings).forEach(r => {
        const dayKey = new Date(r.timestamp).toISOString().split('T')[0];
        dailyData[dayKey] = (dailyData[dayKey] || 0) + r.value;
    });
    return dailyData;
}

function logout() {
  auth.signOut().then(() => { window.location.href = "login.html"; });
}