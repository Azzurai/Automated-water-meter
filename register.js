const auth = firebase.auth();
const db = firebase.database();
document.getElementById("registerForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const password2 = document.getElementById("reg-password2").value;
  if (password !== password2) return alert("Passwords do not match.");
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCred) => {
      const uid = userCred.user.uid;
      db.ref("users/" + uid).set({
        email: email,
        currentUsage: 0,
        lastUpdate: Date.now(),
        dailyUsage: {}
      });
      window.location.href = "dashboard.html";
    })
    .catch((error) => alert("Registration error: " + error.message));
});
