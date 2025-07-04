var dailyUsageGlobal = {};
var totalAccumulatedLitres = 0; // This holds the user's LIFETIME total usage.

/**
 * Marks the current bill as paid by updating the user's profile in Firebase.
 */
async function payBill() {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        alert("Error: You must be logged in to pay a bill.");
        return;
    }

    const currentBillableLiters = parseFloat(document.getElementById("liters").innerText);
    if (currentBillableLiters <= 0) {
        alert("There is no outstanding bill to pay.");
        return;
    }

    if (confirm("This will mark your current bill as paid and reset the amount due to zero. Are you sure?")) {
        try {
            const userProfileRef = firebase.database().ref('users/' + currentUser.uid);
            
            // Update 'usageAtLastPayment' with the current LIFETIME total.
            // `totalAccumulatedLitres` is set by dashboard.js
            await userProfileRef.update({
                usageAtLastPayment: totalAccumulatedLitres
            });

            alert("Payment successful! Your bill has been reset.");
            location.reload(); // Reload the page to show the changes.

        } catch (error) {
            console.error("Payment failed:", error);
            alert("An error occurred while processing your payment. Please try again.");
        }
    }
}


/**
 * Generates and downloads a professional-looking PDF bill for the CURRENT PERIOD.
 */
function downloadPDF() {
  try {
    const userEmail = document.getElementById("userEmail").innerText;
    // These lines now correctly get the usage and price for the current billing period from the UI.
    const billableLitres = parseFloat(document.getElementById("liters").innerText);
    const finalPrice = document.getElementById("price").innerText;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Smart Water Utilities", 105, y, { align: "center" });
    y += 10;
    doc.setFontSize(16);
    doc.text("Official Water Bill", 105, y, { align: "center" });
    y += 15;
    doc.setLineWidth(0.5);
    doc.line(10, y, 200, y);

    // --- Bill Details ---
    y += 10;
    const today = new Date();
    const billDate = today.toISOString().split('T')[0];
    const billNumber = `INV-${today.getTime().toString().slice(-6)}`;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Bill Number:", 10, y); doc.text(billNumber, 50, y);
    doc.text("Bill Date:", 140, y); doc.text(billDate, 170, y);
    
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 10, y);
    doc.setFont("helvetica", "normal"); doc.text(userEmail, 50, y);
    
    // --- Table of Charges ---
    y += 15;
    doc.setLineWidth(0.5); doc.line(10, y, 200, y); y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Description", 15, y);
    doc.text("Usage (m³)", 110, y, { align: 'right' });
    doc.text("Rate (RM)", 155, y, { align: 'right' });
    doc.text("Cost (RM)", 200, y, { align: 'right' });
    y += 3;
    doc.setLineWidth(0.2); doc.line(15, y, 195, y);
    doc.setFont("helvetica", "normal"); y += 7;

    const totalM3 = billableLitres / 1000.0;
    const tier1Rate = 0.57, tier2Rate = 1.03, tier3Rate = 2.00;
    
    let tier1Usage = Math.min(totalM3, 20);
    if(tier1Usage > 0) {
      doc.text("Tier 1 Usage", 15, y); doc.text(tier1Usage.toFixed(3), 110, y, { align: 'right' });
      doc.text(tier1Rate.toFixed(2), 155, y, { align: 'right' });
      doc.text((tier1Usage * tier1Rate).toFixed(2), 200, y, { align: 'right' }); y += 7;
    }

    let tier2Usage = Math.max(0, Math.min(totalM3 - 20, 15));
    if (tier2Usage > 0) {
      doc.text("Tier 2 Usage", 15, y); doc.text(tier2Usage.toFixed(3), 110, y, { align: 'right' });
      doc.text(tier2Rate.toFixed(2), 155, y, { align: 'right' });
      doc.text((tier2Usage * tier2Rate).toFixed(2), 200, y, { align: 'right' }); y += 7;
    }
    
    let tier3Usage = Math.max(0, totalM3 - 35);
    if (tier3Usage > 0) {
      doc.text("Tier 3 Usage", 15, y); doc.text(tier3Usage.toFixed(3), 110, y, { align: 'right' });
      doc.text(tier3Rate.toFixed(2), 155, y, { align: 'right' });
      doc.text((tier3Usage * tier3Rate).toFixed(2), 200, y, { align: 'right' }); y += 7;
    }
    
    // --- Total ---
    y += 5;
    doc.setLineWidth(0.5); doc.line(130, y, 200, y); y += 7;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Total Amount Due", 130, y);
    doc.text(`RM ${finalPrice}`, 200, y, { align: 'right' });

    // --- Footer ---
    y = pageHeight - 30;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.setLineWidth(0.5); doc.line(10, y, 200, y); y += 10;
    doc.text("Thank you for choosing Smart Water Utilities!", 105, y, { align: 'center' });
    
    const safeEmail = userEmail.replace(/[^a-z0-9]/gi, '_');
    doc.save(`Bill-${safeEmail}-${billDate}.pdf`);

  } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Could not generate the PDF. Please ensure all data has loaded.");
  }
}

/**
 * Compiles and downloads the user's daily usage data as a CSV file.
 */
function downloadCSV() {
  // This uses `dailyUsageGlobal` which is correctly populated by dashboard.js with all daily totals
  if(Object.keys(dailyUsageGlobal).length === 0){
      alert("No usage data available to download.");
      return;
  }
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