// === EXTRAS.JS (FINAL VERSION) ===

// These variables are needed for the functions below
var myUsageChart;
var dailyUsageGlobal = {}; // This will be updated by dashboard.js

// Function to calculate the tiered bill.
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

// Function to draw or update the chart on the canvas
function updateChart(dailyUsage) {
  const labels = Object.keys(dailyUsage).sort(); // Sort dates chronologically
  const data = labels.map(label => dailyUsage[label]); // Ensure data matches sorted labels

  const ctx = document.getElementById('usageChart').getContext('2d');
  
  // If a chart already exists, destroy it before creating a new one to prevent bugs
  if (myUsageChart) {
    myUsageChart.destroy();
  }

  myUsageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Water Usage (Liters per Day)',
        data: data,
        backgroundColor: 'rgba(2, 136, 209, 0.2)',
        borderColor: '#0288d1',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

// PDF Generator using the jsPDF library
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Smart Water Meter Billing Summary", 10, 10);
  doc.text("User: " + document.getElementById("userEmail").innerText, 10, 20);
  doc.text("Total Usage: " + document.getElementById("liters").innerText + " L", 10, 30);
  doc.text("Total Bill: RM " + document.getElementById("price").innerText, 10, 40);
  doc.save("water-bill-summary.pdf");
}

// CSV file exporter
function downloadCSV() {
  let csvContent = "data:text/csv;charset=utf-8,Date,Usage (L)\n"; // CSV Header
  for (const date in dailyUsageGlobal) {
    csvContent += `${date},${dailyUsageGlobal[date]}\n`;
  }
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "water-usage.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Fake payment handler for the button
function fakePay() {
  alert("Payment Successful! (This is a demonstration only)");
}