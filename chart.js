
// Example chart (requires Chart.js CDN in HTML)
function renderChart(usageData) {
  const ctx = document.getElementById('usageChart').getContext('2d');
  const labels = Object.keys(usageData);
  const values = Object.values(usageData);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Water Usage (L)',
        data: values,
        borderColor: '#0288d1',
        backgroundColor: 'rgba(2, 136, 209, 0.2)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Liters' }
        },
        x: {
          title: { display: true, text: 'Date' }
        }
      }
    }
  });
}
