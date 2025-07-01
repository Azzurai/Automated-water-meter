// === EXTRAS.JS (FULL AND FINAL VERSION) ===

// These global variables are updated by dashboard.js and used by these functions
var myUsageChart;
var dailyUsageGlobal = {}; 

/**
 * Generates and downloads a professional-looking PDF bill.
 */
function downloadPDF() {
  try {
    // 1. GATHER DATA FROM THE PAGE
    const userEmail = document.getElementById("userEmail").innerText;
    // Get the total liters as a number, not just text, for calculations
    const totalLitres = parseFloat(document.getElementById("liters").innerText);
    const finalPrice = document.getElementById("price").innerText;

    // 2. INITIALIZE THE PDF DOCUMENT
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 20; // Y-coordinate tracker

    // 3. CREATE THE HEADER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Smart Water Utilities", 105, y, { align: "center" });
    y += 10;
    doc.setFontSize(16);
    doc.text("Official Water Bill", 105, y, { align: "center" });
    y += 15;
    doc.setLineWidth(0.5);
    doc.line(10, y, 200, y); // Header underline

    // 4. BILL INFORMATION SECTION
    y += 10;
    const today = new Date();
    const billDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
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
    
    // 5. ITEMIZED USAGE & BILLING TABLE
    y += 15;
    doc.setLineWidth(0.5);
    doc.line(10, y, 200, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    // Table Headers
    doc.text("Description", 15, y);
    doc.text("Usage (m³)", 110, y, { align: 'right' });
    doc.text("Rate (RM)", 155, y, { align: 'right' });
    doc.text("Cost (RM)", 200, y, { align: 'right' });
    y += 3;
    doc.setLineWidth(0.2);
    doc.line(15, y, 195, y);
    doc.setFont("helvetica", "normal");
    y += 7;

    // Calculate billing tiers for display
    const totalM3 = totalLitres / 1000.0;
    
    // Tier 1 Data
    const tier1Rate = 0.57;
    let tier1Usage = Math.min(totalM3, 20);
    let tier1Cost = tier1Usage * tier1Rate;
    doc.text("Tier 1 Usage", 15, y);
    doc.text(tier1Usage.toFixed(3), 110, y, { align: 'right' });
    doc.text(tier1Rate.toFixed(2), 155, y, { align: 'right' });
    doc.text(tier1Cost.toFixed(2), 200, y, { align: 'right' });
    y += 7;

    // Tier 2 Data (only display if used)
    const tier2Rate = 1.03;
    let tier2Usage = Math.max(0, Math.min(totalM3 - 20, 15));
    if (tier2Usage > 0) {
      let tier2Cost = tier2Usage * tier2Rate;
      doc.text("Tier 2 Usage", 15, y);
      doc.text(tier2Usage.toFixed(3), 110, y, { align: 'right' });
      doc.text(tier2Rate.toFixed(2), 155, y, { align: 'right' });
      doc.text(tier2Cost.toFixed(2), 200, y, { align: 'right' });
      y += 7;
    }

    // Tier 3 Data (only display if used)
    const tier3Rate = 2.00;
    let tier3Usage = Math.max(0, totalM3 - 35);
     if (tier3Usage > 0) {
      let tier3Cost = tier3Usage * tier3Rate;
      doc.text("Tier 3 Usage", 15, y);
      doc.text(tier3Usage.toFixed(3), 110, y, { align: 'right' });
      doc.text(tier3Rate.toFixed(2), 155, y, { align: 'right' });
      doc.text(tier3Cost.toFixed(2), 200, y, { align: 'right' });
      y += 7;
    }
    
    // 6. FINAL TOTAL SECTION
    y += 5;
    doc.setLineWidth(0.5);
    doc.line(130, y, 200, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total Amount Due", 130, y);
    doc.text(`RM ${finalPrice}`, 200, y, { align: 'right' });

    // 7. FOOTER SECTION
    y = pageHeight - 30;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setLineWidth(0.5);
    doc.line(10, y, 200, y);
    y += 10;
    doc.text("Thank you for choosing Smart Water Utilities!", 105, y, { align: 'center' });
    y += 5;
    doc.text("This bill was generated automatically by your Smart Water Metering System.", 105, y, { align: 'center' });

    // 8. SAVE THE PDF WITH A DESCRIPTIVE FILENAME
    const safeEmail = userEmail.replace(/[^a-z0-9]/gi, '_');
    doc.save(`Bill-${safeEmail}-${billDate}.pdf`);

  } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Could not generate the PDF. Please ensure all page data has loaded correctly before trying again.");
  }
}

// === RESTORED FUNCTIONS ===

/**
 * Calculates the water bill based on tiered pricing.
 * @param {number} totalLiters - The total liters of water used.
 */
function calculateTieredPrice(totalLiters) {
  const totalM3 = totalLiters / 1000.0;
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

/**
 * Renders or updates the chart on the page with the latest daily usage data.
 * @param {object} dailyUsage - An object with dates as keys and usage as values.
 */
function updateChart(dailyUsage) {
  const labels = Object.keys(dailyUsage).sort(); // Sort dates chronologically
  const data = labels.map(label => dailyUsage[label]); // Ensure data matches sorted labels

  const ctx = document.getElementById('usageChart').getContext('2d');
  
  // If a chart already exists, destroy it before creating a new one to prevent bugs and memory leaks
  if (myUsageChart) {
    myUsageChart.destroy();
  }
  
  myUsageChart = new Chart(ctx, {
    type: 'bar', // You can change this to 'line' if you prefer
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Water Usage (Liters)',
        data: data,
        backgroundColor: 'rgba(2, 136, 209, 0.2)',
        borderColor: '#0288d1',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
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

/**
 * Compiles all displayed user data into a CSV file and downloads it.
 */
function downloadCSV() {
  let csvContent = "data:text/csv;charset=utf-8,Date,Usage (L)\n"; // CSV Header
  
  // Use the global variable updated by dashboard.js
  for (const date in dailyUsageGlobal) {
    csvContent += `${date},${dailyUsageGlobal[date]}\n`;
  }
  
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "water_usage_report.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * A demonstration payment handler.
 */
function fakePay() {
  alert("Payment Successful! (This is a demonstration only)");
}