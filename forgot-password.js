const auth = firebase.auth();
document.getElementById("resetForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("reset-email").value;
  auth.sendPasswordResetEmail(email)
    .then(() => {
      alert("Password reset email sent!");
      window.location.href = "login.html";
    })
    .catch((error) => alert("Error: " + error.message));
});
