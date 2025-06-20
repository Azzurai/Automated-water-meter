const auth = firebase.auth();
const db = firebase.database();

auth.onAuthStateChanged(user => {
  if (!user) return (window.location.href = "login.html");

  db.ref("users/" + user.uid).once("value").then(snapshot => {
    const role = snapshot.val()?.role;
    if (!role) return (window.location.href = "login.html");

    if (role === "admin") {
      // Redirect to admin dashboard if on user dashboard
      if (window.location.pathname.includes("dashboard.html")) {
        window.location.href = "admin-dashboard.html";
      }
    } else if (role === "user") {
      // Redirect to user dashboard if on admin
      if (window.location.pathname.includes("admin-dashboard.html")) {
        window.location.href = "dashboard.html";
      }
    }
  });
});

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

function resetUsage(uid) {
  if (confirm("Reset usage for this user?")) {
    db.ref("users/" + uid + "/usage").remove();
    location.reload();
  }
}

function deleteUser(uid) {
  if (confirm("Delete this user?")) {
    db.ref("users/" + uid).remove();
    location.reload();
  }
}

function downloadCSV() {
  const rows = [["Email", "Water Used (L)", "Total (RM)"]];
  for (const user of window.allUserData) {
    rows.push([user.email, user.totalLiters, user.totalPrice]);
  }
  const csvContent = rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "water_meter_users.csv";
  link.click();
}

function filterUsers() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#userTableBody tr");
  rows.forEach(row => {
    const emailCell = row.querySelector("td");
    row.style.display = emailCell && emailCell.innerText.toLowerCase().includes(search) ? "" : "none";
  });
}

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  //Role check
  db.ref("users/" + user.uid).once("value").then(snapshot => {
    if (snapshot.val()?.role !== "admin") {
      window.location.href = "dashboard.html";
    }
  });

  db.ref("users").once("value").then(snapshot => {
    const users = snapshot.val();
    const tbody = document.getElementById("userTableBody");
    window.allUserData = [];

    for (let uid in users) {
      const user = users[uid];
      let totalLiters = 0;
      if (user.usage) {
        for (let date in user.usage) {
          totalLiters += user.usage[date];
        }
      }
      const totalPrice = calculateTieredPrice(totalLiters);
      window.allUserData.push({ email: user.email, totalLiters, totalPrice });

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.email}</td>
        <td>${totalLiters}</td>
        <td>RM ${totalPrice}</td>
        <td>
          <button onclick="resetUsage('${uid}')">Reset</button>
          <button onclick="deleteUser('${uid}')">Delete</button>
        </td>`;
      tbody.appendChild(row);
    }
  });
});
