// ==========================================================
//  DASHBOARD.JS (TYPO CORRECTED - Final Version)
// ==========================================================

const auth = firebase.auth();
const db = firebase.database();

// --- Leak Detection Configuration ---
const LEAK_WARNING_THRESHOLD = 2.0; 
const LEAK_MINIMUM_THRESHOLD = 0.01;
const LEAK_DETECTION_TRIGGER_COUNT = 15;
let leakDetectionCounter = 0;

// Main authentication state listener
auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = "login.html"; return; }
    document.getElementById("userEmail").innerText = user.email;

    db.ref("users/" + user.uid).once("value").then(snapshot => {
        const userData = snapshot.val() || {};
        if (!userData.meterId) {
            alert("Error: Your account is not linked to a meter.");
            return;
        }

        const usageAtLastPayment = userData.usageAtLastPayment || 0;
        const meterId = userData.meterId;
        const usageRef = db.ref("meter_readings/" + meterId);
        
        usageRef.on("value", dataSnapshot => {
            const rawReadings = dataSnapshot.val();
            if (!rawReadings) {
                // Handle new users
                document.getElementById("liters").innerText = "0.00";
                document.getElementById("price").innerText = "0.00";
                document.getElementById("flowRate").innerText = "0.00";
                updateChart({});
                return; 
            }

            // Bill Calculation
            const totalLifetimeLitres = Object.values(rawReadings).reduce((sum, r) => sum + (r.value || 0), 0);
            const unpaidLitres = totalLifetimeLitres - usageAtLastPayment;
            const currentBill = calculateTieredPrice(unpaidLitres);
            window.totalAccumulatedLitres = totalLifetimeLitres;

            // Leak Detection
            const readingsArray = Object.values(rawReadings).sort((a, b) => a.timestamp - b.timestamp);
            const latestReading = readingsArray[readingsArray.length - 1];
            const currentFlowRate = latestReading.flowRate || 0;
            
            // ===================================
            // === THIS IS THE CORRECTED LINE ===
            // ===================================
            if (currentFlowRate > LEAK_MINIMUM_THRESHOLD && currentFlowRate < LEAK_WARNING_THRESHOLD) {
                leakDetectionCounter++;
            } else {
                leakDetectionCounter = 0;
                hideLeakNotification();
            }
            if (leakDetectionCounter >= LEAK_DETECTION_TRIGGER_COUNT) {
                showLeakNotification();
            }
            
            // --- Update UI ---
            document.getElementById("flowRate").innerText = currentFlowRate.toFixed(2);
            document.getElementById("liters").innerText = totalLifetimeLitres.toFixed(2);
            document.getElementById("price").innerText = currentBill;
            
            // Update chart
            const dailyData = aggregateReadingsByDay(rawReadings);
            window.dailyUsageGlobal = dailyData;
            updateChart(dailyData);
        });
    });
});

// --- Helper Functions ---
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
        dailyData[dayKey] = (dailyData[dayKey] || 0) + (r.value || 0);
    });
    return dailyData;
}
function logout() {
  auth.signOut().then(() => { window.location.href = "login.html"; });
}