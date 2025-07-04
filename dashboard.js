const auth = firebase.auth();
const db = firebase.database();

let chartInstance = null;
let currentChartView = 'daily';

// Throttling Variables
let isThrottled = false;
const UI_UPDATE_INTERVAL = 10000; // 10,000ms = 10 seconds

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
            if (isThrottled) { return; }
            isThrottled = true;
            setTimeout(() => { isThrottled = false; }, UI_UPDATE_INTERVAL);

            const rawReadings = dataSnapshot.val();
            if (!rawReadings) {
                document.getElementById("liters").innerText = "0.00";
                document.getElementById("totalLiters").innerText = "0.00"; 
                document.getElementById("price").innerText = "0.00";
                hideLeakNotification();
                return;
            };

            const readingsArray = Object.values(rawReadings).sort((a, b) => a.timestamp - b.timestamp);
            const latestReading = readingsArray[readingsArray.length - 1];
            const currentFlowRate = latestReading.flowRate || 0;

            if (currentFlowRate < 2 && currentFlowRate > 0) { 
                showLeakNotification();
            } else {
                hideLeakNotification();
            }

            const totalLifetimeLiters = Object.values(rawReadings).reduce((sum, reading) => sum + (reading.value || 0), 0);
            const billableLiters = totalLifetimeLiters - usageAtLastPayment;
            
            window.totalAccumulatedLitres = totalLifetimeLiters;
            window.readingsRaw = rawReadings; 

            document.getElementById("flowRate").innerText = currentFlowRate.toFixed(2);
            document.getElementById("liters").innerText = billableLiters.toFixed(2); 
            document.getElementById("totalLiters").innerText = totalLifetimeLiters.toFixed(2);
            document.getElementById("price").innerText = calculateTieredPrice(billableLiters);
            
            redrawChartBasedOnState();
        });
    });
});

function updateChart(data, label = "Water Usage (L)") {
    const ctx = document.getElementById('usageChart').getContext('2d');
    const labels = Object.keys(data).sort();
    const values = labels.map(label => data[label]);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                fill: true,
                backgroundColor: 'rgba(2, 136, 209, 0.2)',
                borderColor: '#0288d1',
                borderWidth: 2,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Liters' }},
                x: { title: { display: true, text: 'Time Period' }}
            }
        }
    });
}

function redrawChartBasedOnState() {
    if (!window.readingsRaw) return; 

    if (currentChartView === 'daily') {
        const dailyData = aggregateReadingsByDay(window.readingsRaw);
        updateChart(dailyData, "Daily Water Usage (L)");
    } else if (currentChartView === 'weekly') {
        const weeklyData = aggregateReadingsByWeek(window.readingsRaw);
        updateChart(weeklyData, "Weekly Water Usage (L)");
    } else if (currentChartView === 'monthly') { 
        const monthlyData = aggregateReadingsByMonth(window.readingsRaw);
        updateChart(monthlyData, "Monthly Water Usage (L)");
    } else if (currentChartView === 'yearly') {
        const yearlyData = aggregateReadingsByYear(window.readingsRaw);
        updateChart(yearlyData, "Yearly Water Usage (L)");
    }
}

// --- AGGREGATION HELPERS ---
function aggregateReadingsByDay(readings) {
    const dailyData = {};
    Object.values(readings).forEach(r => {
        const dayKey = new Date(r.timestamp).toISOString().split('T')[0];
        dailyData[dayKey] = (dailyData[dayKey] || 0) + (r.value || 0);
    });
    return dailyData;
}

function aggregateReadingsByWeek(readings) {
    const weeklyData = {};
    Object.values(readings).forEach(r => {
        const date = new Date(r.timestamp);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + (r.value || 0);
    });
    const orderedWeeklyData = {};
    Object.keys(weeklyData).sort().forEach(key => {
        orderedWeeklyData[key] = weeklyData[key];
    });
    return orderedWeeklyData;
}

// --- NEW FUNCTION TO AGGREGATE BY MONTH ---
function aggregateReadingsByMonth(readings) {
    const monthlyData = {};
    Object.values(readings).forEach(r => {
        const date = new Date(r.timestamp);
        const year = date.getFullYear();
        // getMonth() is 0-indexed (Jan=0), so add 1. Pad with '0' for correct sorting.
        const month = String(date.getMonth() + 1).padStart(2, '0'); 
        const monthKey = `${year}-${month}`; // e.g., "2024-05"
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (r.value || 0);
    });
    return monthlyData;
}

function aggregateReadingsByYear(readings) {
    const yearlyData = {};
    Object.values(readings).forEach(r => {
        const year = new Date(r.timestamp).getFullYear();
        yearlyData[year] = (yearlyData[year] || 0) + (r.value || 0);
    });
    return yearlyData;
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}


// --- Unchanged Functions ---
function showLeakNotification() { /* ... */ }
function hideLeakNotification() { /* ... */ }
function logout() { /* ... */ }
function calculateTieredPrice(totalLiters) { /* ... */ }


// --- UPDATED BUTTON LISTENERS ---
document.getElementById("dailyButton").addEventListener("click", () => {
    currentChartView = 'daily';
    redrawChartBasedOnState();
});

document.getElementById("weeklyButton").addEventListener("click", () => {
    currentChartView = 'weekly';
    redrawChartBasedOnState();
});

// ADDED LISTENER FOR MONTH BUTTON
document.getElementById("monthlyButton").addEventListener("click", () => {
    currentChartView = 'monthly';
    redrawChartBasedOnState();
});

document.getElementById("yearlyButton").addEventListener("click", () => {
    currentChartView = 'yearly';
    redrawChartBasedOnState();
});

// Helper functions (hide/show notification, logout, etc.) remain unchanged
function showLeakNotification() {
    const n = document.getElementById('leak-notification');
    if (n) n.style.display = 'flex';
}
function hideLeakNotification() {
    const n = document.getElementById('leak-notification');
    if (n) n.style.display = 'none';
}
function logout() {
    auth.signOut().then(() => {
        window.location.href = "login.html";
    });
}
function calculateTieredPrice(totalLiters) {
    const totalCubicMeters = totalLiters / 1000;
    let price = 0;
    if (totalCubicMeters <= 20) {
        price = totalCubicMeters * 0.57;
    } else if (totalCubicMeters <= 35) {
        price = (20 * 0.57) + ((totalCubicMeters - 20) * 1.03);
    } else {
        price = (20 * 0.57) + (15 * 1.03) + ((totalCubicMeters - 35) * 2.00);
    }
    return price.toFixed(2);
}