// === ADMIN-DASHBOARD.JS (FINAL VERSION) ===
const auth = firebase.auth();
const db = firebase.database();
let allUsersData = [];

auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = "login.html"; return; }
    db.ref('users/' + user.uid).once('value').then(snapshot => {
        if (snapshot.val()?.role !== 'admin') { window.location.href = "dashboard.html"; return; }
        fetchAllData();
    });
});

function fetchAllData() {
    Promise.all([
        db.ref('users').once('value'),
        db.ref('meter_readings').once('value')
    ]).then(([usersSnapshot, metersSnapshot]) => {
        const userList = usersSnapshot.val();
        const meterReadings = metersSnapshot.val() || {};
        const meterTotals = {};
        allUsersData = [];

        for (const meterId in meterReadings) {
            meterTotals[meterId] = Object.values(meterReadings[meterId]).reduce((sum, reading) => sum + (reading.value || 0), 0);
        }

        for (const uid in userList) {
            if (userList[uid].role === 'user') {
                const userProfile = userList[uid];
                const meterId = userProfile.meterId;
                const totalLiters = meterTotals[meterId] || 0;
                
                allUsersData.push({
                    uid: uid, email: userProfile.email, meterId: meterId || 'N/A',
                    totalLiters: totalLiters, totalPrice: calculateTieredPrice(totalLiters)
                });
            }
        }
        renderTable(allUsersData);
    });
}

function renderTable(users) {
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.email}</td>
            <td>${user.totalLiters.toFixed(2)}</td>
            <td>RM ${user.totalPrice}</td>
            <td>
                <button onclick="resetUsage('${user.meterId}', '${user.email}')">Reset Usage</button>
                <button onclick="deleteUser('${user.uid}', '${user.email}')">Delete User</button>
            </td>`;
        tableBody.appendChild(row);
    });
}

function resetUsage(meterId, email) {
    if (!meterId || meterId === 'N/A') { alert("Cannot reset: No meter assigned to this user."); return; }
    if (confirm(`Are you SURE you want to reset ALL usage for ${email} (Meter: ${meterId})?`)) {
        db.ref("meter_readings/" + meterId).remove().then(() => location.reload());
    }
}

function deleteUser(uid, email) {
    if (confirm(`Are you SURE you want to DELETE user ${email}? This removes their login!`)) {
        db.ref("users/" + uid).remove().then(() => location.reload());
    }
}

function calculateTieredPrice(liters) {
    const m3 = liters / 1000;
    let price = 0;
    if (m3 <= 20) { price = m3 * 0.57; } 
    else if (m3 <= 35) { price = (20 * 0.57) + ((m3 - 20) * 1.03); } 
    else { price = (20 * 0.57) + (15 * 1.03) + ((m3 - 35) * 2.00); }
    return price.toFixed(2);
}

function filterUsers() { /* As before */ }
function downloadCSV() { /* As before */ }
function logout() { auth.signOut().then(() => { window.location.href = "login.html"; }); }