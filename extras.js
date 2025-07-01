/* globals Chart, jspdf, myUsageChart, dailyUsageGlobal */

// === EXTRAS.JS (CLEANED FOR VS CODE) ===

// These global variables are used by functions in this file.
// This one holds the chart instance so we can update it.
var myUsageChart; 
// This one holds the usage data for CSV/PDF exporting.
var dailyUsageGlobal = {}; 

/**
 * Renders or updates a LINE chart on the page.
 * @param {object} dailyUsage - An object with dates as keys and usage as values.
 */
function updateChart(dailyUsage) {
  const labels = Object.keys(dailyUsage).sort();
  const data = labels.map(label => dailyUsage[label]);
  const ctx = document.getElementById('usageChart').getContext('2d');
  
  if (myUsageChart) {
    myUsageChart.destroy();
  }
  
  myUsageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Water Usage (Liters)',
        data: data,
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 2,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: { 
        y: { 
          beginAtZero: true,
          title: { display: true, text: 'Liters Used' }
        },
        x: {
          title: { display: true, text: 'Date' }
        }
      },
      plugins: {
        legend: { display: true, position: 'top' }
      }
    }
  });
}

/**
 * Generates and downloads a professional-looking PDF bill.
 */
function downloadPDF() {
  try {
    const userEmail = document.getElementById("userEmail").innerText;
    const totalLitres = parseFloat(document.getElementById("liters").innerText);
    const finalPrice = document.getElementById("price").innerText;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Smart Water Utilities", 105, y, { align: "center" });
    y += 10;
    doc.setFontSize(16);
    doc.text("Official Water Bill", 105, y, { align: "center" });
    y += 15;
    doc.setLineWidth(0.5);
    doc.line(10, y, 200, y);

    y += 10;
    const today = new Date();
    const billDate = today.toISOString().split('T')[0];
    const billNumber = `INV-${today.getTime().toString().slice(-6)}`;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Bill Number:", 10, y);
    doc.text(billNumber, 50, y);
    doc.text("Bill Date:", 140, y);
    doc.text(billDate, 170, y);
    
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(userEmail, 50, y);
    
    y += 15;
    doc.setLineWidth(0.5);
    doc.line(10, y, 200, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Description", 15, y);
    doc.text("Usage (m³)", 110, y, { align: 'right' });
    doc.text("Rate (RM)", 155, y, { align: 'right' });
    doc.text("Cost (RM)", 200, y, { align: 'right' });
    y += 3;
    doc.setLineWidth(0.2);
    doc.line(15, y, 195, y);
    doc.setFont("helvetica", "normal");
    y += 7;

    const totalM3 = totalLitres / 1000.0;
    const tier1Rate = 0.57, tier2Rate = 1.03, tier3Rate = 2.00;
    
    let tier1Usage = Math.min(totalM3, 20);
    doc.text("Tier 1 Usage", 15, y);
    doc.text(tier1Usage.toFixed(3), 110, y, { align: 'right' });
    doc.text(tier1Rate.toFixed(2), 155, y, { align: 'right' });
    doc.text((tier1Usage * tier1Rate).toFixed(2), 200, y, { align: 'right' });
    y += 7;

    let tier2Usage = Math.max(0, Math.min(totalM3 - 20, 15));
    if (tier2Usage > 0) {
      doc.text("Tier 2 Usage", 15, y);
      doc.text(tier2Usage.toFixed(3), 110, y, { align: 'right' });
      doc.text(tier2Rate.toFixed(2), 155, y, { align: 'right' });
      doc.text((tier2Usage * tier2Rate).toFixed(2), 200, y, { align: 'right' });
      y += 7;
    }
    
    let tier3Usage = Math.max(0, totalM3 - 35);
    if (tier3Usage > 0) {
      doc.text("Tier 3 Usage", 15, y);
      doc.text(tier3Usage.toFixed(3), 110, y, { align: 'right' });
      doc.text(tier3Rate.toFixed(2), 155, y, { align: 'right' });
      doc.text((tier3Usage * tier3Rate).toFixed(2), 200, y, { align: 'right' });
      y += 7;
    }
    
    y += 5;
    doc.setLineWidth(0.5);
    doc.line(130, y, 200, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total Amount Due", 130, y);
    doc.text(`RM ${finalPrice}`, 200, y, { align: 'right' });

    y = pageHeight - 30;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setLineWidth(0.5);
    doc.line(10, y, 200, y);
    y += 10;
    doc.text("Thank you for choosing Smart Water Utilities!", 105, y, { align: 'center' });
    
    const safeEmail = userEmail.replace(/[^a-z0-9]/gi, '_');
    doc.save(`Bill-${safeEmail}-${billDate}.pdf`);
  } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Could not generate the PDF. Please check that all data has loaded.");
  }
}

/**
 * Calculates the water bill based on tiered pricing.
 * @param {number} totalLiters - The total liters of water used.
 */
function calculateTieredPrice(totalLiters) {
  const totalM3 = totalLiters / 1000.0;
  let price = 0;
  if (totalM3 <= 20) { price = totalM3 * 0.57; } 
  else if (totalM3 <= 35) { price = (20 * 0.57) + ((totalM3 - 20) * 1.03); } 
  else { price = (20 * 0.57) + (15 * 1.03) + ((totalM3 - 35) * 2.00); }
  return price.toFixed(2);
}

/**
 * Compiles and downloads daily usage data as a CSV file.
 */
function downloadCSV() {
  let csvContent = "data:text/csv;charset=utf-8,Date,Usage (L)\n";
  for (const date in dailyUsageGlobal) { 
      csvContent += `${date},${dailyUsageGlobal[date].toFixed(2)}\n`; 
  }
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "water_usage_report.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * A demonstration payment handler function.
 */
function fakePay() {
  alert("Payment Successful! (This is a demonstration only)");
}