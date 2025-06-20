// PDF Generator (jsPDF)
function downloadPDF() {
  const doc = new jspdf.jsPDF();
  doc.text("Smart Water Meter Billing Summary", 10, 10);
  doc.text("User: " + document.getElementById("userEmail").innerText, 10, 20);
  doc.text("Usage: " + document.getElementById("liters").innerText + " L", 10, 30);
  doc.text("Total: RM " + document.getElementById("price").innerText, 10, 40);
  doc.save("bill.pdf");
}

// CSV Export
function downloadCSV() {
  const rows = [["Date", "Usage (L)"]];
  for (const date in dailyUsageGlobal) {
    rows.push([date, dailyUsageGlobal[date]]);
  }
  let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "usage.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Payment handler.Dis sum fake 
function fakePay() {
  alert("Payment successful! (demo only)");
}

// Render chart
function updateChart(dailyUsage) {
  dailyUsageGlobal = dailyUsage || {};
  const labels = Object.keys(dailyUsageGlobal);
  const data = Object.values(dailyUsageGlobal);

  const ctx = document.getElementById('usageChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Water Usage (Liters)',
        data: data,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}
