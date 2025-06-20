const auth = firebase.auth();
const db = firebase.database();
let dailyUsageGlobal = {};

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

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    document.getElementById("userEmail").innerText = user.email;
    const usageRef = db.ref("users/" + user.uid + "/usage");
    usageRef.once("value").then(snapshot => {
      const usageData = snapshot.val();
      let totalLiters = 0;
      if (usageData) {
        for (let date in usageData) {
          totalLiters += usageData[date];
        }
        dailyUsageGlobal = usageData;
        document.getElementById("liters").innerText = totalLiters;
        document.getElementById("price").innerText = calculateTieredPrice(totalLiters);
        updateChart(dailyUsageGlobal);
      } else {
        document.getElementById("liters").innerText = "0";
        document.getElementById("price").innerText = "0.00";
      }
    });
  }
});
