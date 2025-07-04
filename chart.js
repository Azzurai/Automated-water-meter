// Function to render the chart based on daily or weekly data
function renderChart(usageData, type) {
  const ctx = document.getElementById('usageChart').getContext('2d');
  
  let labels = [];
  let values = [];
  
  // Determine labels and values based on the chart type (daily or weekly)
  if (type === 'daily') {
    // Daily data (hourly data with usage)
    labels = Object.keys(usageData); // X-Axis: Hour of the day
    values = Object.values(usageData); // Y-Axis: Water usage in liters
  } else if (type === 'weekly') {
    // Weekly data (day-wise total usage)
    labels = Object.keys(usageData); // X-Axis: Days of the week
    values = Object.values(usageData); // Y-Axis: Total usage for each day
  }

  // Create the chart (line graph)
  new Chart(ctx, {
    type: 'line',  // Ensures the graph is a line chart
    data: {
      labels: labels,
      datasets: [{
        label: type === 'daily' ? 'Daily Water Usage (L)' : 'Weekly Water Usage (L)',
        data: values,
        borderColor: '#0288d1', // Line color
        backgroundColor: 'rgba(2, 136, 209, 0.2)', // Fill color (optional)
        fill: true, // Fills the area under the line
        tension: 0.3, // Line smoothing (optional)
        borderWidth: 2 // Line thickness
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
          title: { display: true, text: type === 'daily' ? 'Hour of the Day' : 'Day of the Week' }
        }
      }
    }
  });
}
