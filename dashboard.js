const auth = firebase.auth();
const db = firebase.database();

const NOTIFICATION_TRIGGER_COUNT = 5;
let zeroFlowCounter = 0;
let chartInstance = null;

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
            if (!rawReadings) return;

            const readingsArray = Object.values(rawReadings).sort((a, b) => a.timestamp - b.timestamp);
            const latestReading = readingsArray[readingsArray.length - 1];
            const currentFlowRate = latestReading.flowRate || 0;

            // Leak Detection Logic
            if (currentFlowRate < 0.01) {
                zeroFlowCounter++;
                console.log(`Water is OFF. Notification counter at: ${zeroFlowCounter} / ${NOTIFICATION_TRIGGER_COUNT}`);
            } else {
                zeroFlowCounter = 0;
                hideLeakNotification();
            }

            if (zeroFlowCounter >= NOTIFICATION_TRIGGER_COUNT) {
                console.log("TRIGGER REACHED! Showing notification for presentation.");
                showLeakNotification();
            }

            const dailyData = aggregateReadingsByDay(rawReadings);
            const totalLiters = Object.values(dailyData).reduce((sum, val) => sum + val, 0);

            window.dailyUsageGlobal = dailyData;
            window.readingsRaw = rawReadings;

            document.getElementById("flowRate").innerText = currentFlowRate.toFixed(2);
            document.getElementById("liters").innerText = totalLiters.toFixed(2);
            document.getElementById("price").innerText = calculateTieredPrice(totalLiters);
            updateChart(dailyData, "Daily Water Usage (L)");
        });
    });
});

// --- Chart Updating ---
function updateChart(data, label = "Water Usage (L)") {
    const ctx = document.getElementById('usageChart').getContext('2d');
    const labels = Object.keys(data);
    const values = Object.values(data);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                borderColor: '#0288d1',
                backgroundColor: 'rgba(2, 136, 209, 0.5)',
                fill: true
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

// --- Aggregation Helpers ---
function aggregateReadingsByDay(readings) {
    const dailyData = {};
    Object.values(readings).forEach(r => {
        const dayKey = new Date(r.timestamp).toISOString().split('T')[0];
        dailyData[dayKey] = (dailyData[dayKey] || 0) + r.value;
    });
    return dailyData;
}

function aggregateReadingsByWeek(readings) {
    const weeklyData = {};
    Object.values(readings).forEach(r => {
        const date = new Date(r.timestamp);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const weekKey = `${year}-W${week}`;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + r.value;
    });
    return weeklyData;
}

function aggregateReadingsByYear(readings) {
    const yearlyData = {};
    Object.values(readings).forEach(r => {
        const year = new Date(r.timestamp).getFullYear();
        yearlyData[year] = (yearlyData[year] || 0) + r.value;
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

// --- Notification ---
function showLeakNotification() {
    const n = document.getElementById('leak-notification');
    if (n) n.style.display = 'flex';
}

function hideLeakNotification() {
    const n = document.getElementById('leak-notification');
    if (n) n.style.display = 'none';
}

// --- Logout ---
function logout() {
    auth.signOut().then(() => {
        window.location.href = "login.html";
    });
}

// --- Tiered Pricing ---
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

// --- Button Actions ---
document.getElementById("dailyButton").addEventListener("click", () => {
    const daily = aggregateReadingsByDay(window.readingsRaw);
    updateChart(daily, "Daily Water Usage (L)");
});
document.getElementById("weeklyButton").addEventListener("click", () => {
    const weekly = aggregateReadingsByWeek(window.readingsRaw);
    updateChart(weekly, "Weekly Water Usage (L)");
});
document.getElementById("yearlyButton").addEventListener("click", () => {
    const yearly = aggregateReadingsByYear(window.readingsRaw);
    updateChart(yearly, "Yearly Water Usage (L)");
});
