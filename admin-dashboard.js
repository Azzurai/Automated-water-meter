// === ADMIN-DASHBOARD.JS (FINAL COMBINED VERSION) ===

const auth = firebase.auth();
const db = firebase.database();
let allUsersData = []; // Global for CSV/Search functions

// === ONE AUTH LISTENER TO RULE THEM ALL ===
// This runs once when the page loads to check login and role.
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "login.html"; // Not logged in
        return;
    }
    db.ref('users/' + user.uid).once('value').then(snapshot => {
        if (snapshot.val()?.role !== 'admin') {
            console.error("Access Denied. User is not an admin.");
            window.location.href = "dashboard.html"; // Redirect non-admins
            return;
        }
        // User is confirmed as an admin, now fetch all the data.
        fetchAllData();
    });
});

// Fetches ALL users and ALL meter readings, then combines them.
function fetchAllData() {
    Promise.all([
        db.ref('users').once('value'),
        db.ref('meter_readings').once('value')
    ]).then(([usersSnapshot, metersSnapshot]) => {
        const userList = usersSnapshot.val();
        const meterReadings = metersSnapshot.val() || {}; // Use empty object if no readings exist
        allUsersData = [];

        // Pre-calculate totals for every meter for efficiency
        const meterTotals = {};
        for (const meterId in meterReadings) {
            meterTotals[meterId] = Object.values(meterReadings[meterId]).reduce((sum, reading) => sum + reading.value, 0);
        }

        // Combine user data with their meter totals
        for (const uid in userList) {
            if (userList[uid].role === 'user') {
                const userProfile = userList[uid];
                const meterId = userProfile.meterId;
                const totalLiters = meterTotals[meterId] || 0;
                
                allUsersData.push({
                    uid: uid,
                    email: userProfile.email,
                    meterId: meterId || 'N/A',
                    totalLiters: totalLiters,
                    totalPrice: calculateTieredPrice(totalLiters)
                });
            }
        }
        renderTable(allUsersData);
    });
}

// Renders the data into the HTML table
function renderTable(users) {
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        // Added data-meter-id attribute to use in our functions
        row.innerHTML = `
            <td>${user.email}</td>
            <td>${user.totalLiters.toFixed(2)}</td>
            <td>RM ${user.totalPrice}</td>
            <td>
                <button onclick="resetUsage('${user.uid}', '${user.meterId}')">Reset</button>
                <button onclick="deleteUser('${user.uid}')">Delete</button>
            </td>`;
        tableBody.appendChild(row);
    });
}

// === YOUR HELPER FUNCTIONS, ADAPTED & IMPROVED ===

// ** NEW **: Now resets the data from the CORRECT location
function resetUsage(uid, meterId) {
    if (!meterId || meterId === 'N/A') {
        alert("Cannot reset usage: user does not have a meter assigned.");
        return;
    }
    if (confirm(`Are you sure you want to reset all usage data for meter "${meterId}"? This cannot be undone.`)) {
        // This removes the entire record from the meter_readings collection
        db.ref("meter_readings/" + meterId).remove()
            .then(() => {
                alert("Usage reset successfully.");
                location.reload(); // Refresh the page to show the changes
            })
            .catch(error => {
                console.error("Error resetting usage: ", error);
                alert("An error occurred. Check console for details.");
            });
    }
}

// This function is still correct.
function deleteUser(uid) {
  if (confirm("Are you sure you want to delete this user entirely? This cannot be undone.")) {
    db.ref("users/" + uid).remove()
        .then(() => {
            alert("User deleted successfully.");
            // Also good to delete their meter readings if they are deleted
            // This is optional and depends on your business logic. For now, we'll just reload.
            location.reload(); 
        })
        .catch(error => {
            console.error("Error deleting user: ", error);
        });
  }
}

function filterUsers() {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#userTableBody tr");
    rows.forEach(row => {
        const emailCell = row.cells[0];
        row.style.display = emailCell && emailCell.textContent.toLowerCase().includes(search) ? "" : "none";
    });
}

function downloadCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Email,Water Used (L),Total Bill (RM)\n";
    allUsersData.forEach(user => {
        csvContent += `${user.email},${user.totalLiters.toFixed(2)},${user.totalPrice}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "all_user_usage_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function calculateTieredPrice(totalLiters) {
  const totalM3 = totalLiters / 1000;
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

function logout() {
  auth.signOut().then(() => {
    window.location.href = "login.html";
  });
}