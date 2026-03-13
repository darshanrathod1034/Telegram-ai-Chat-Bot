const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Generates a professional hotel booking request PDF from structured JSON data
 * @param {Object} bookingData - The structured booking JSON data
 * @param {string} outputPath - Path where the PDF will be saved
 * @returns {Promise<string>} - Path to the generated PDF
 */
async function generateBookingPDF(bookingData, outputPath = 'booking-request.pdf') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const booking = bookingData.booking || bookingData;
      
      // Colors
      const primaryColor = '#1a365d';
      const headerBgColor = '#2c5282';
      const textColor = '#1a202c';
      const labelColor = '#4a5568';

      // Helper function to draw a field with label and value
      function drawField(doc, label, value, x) {
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(labelColor)
          .text(label + ':', x);

        doc.fontSize(12)
          .font('Helvetica')
          .fillColor(textColor)
          .text(value || 'N/A', x + 140);

        doc.moveDown(0.6);
      }

      // ========== HEADER ==========
      doc.rect(0, 0, 595, 80).fill(headerBgColor);
      
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('BAPS UTARA CHITTI', 0, 30, { align: 'center' });

      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#e2e8f0')
        .text('Booking Confirmation Form', 0, 55, { align: 'center' });

      // ========== GUEST INFO SECTION ==========
      doc.moveDown(1);
      
      // Section Title
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('GUEST INFORMATION', 50);

      doc.moveDown(0.3);
      
      // Divider
      doc.strokeColor(primaryColor)
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown(0.8);

      // Guest Name
      drawField(doc, 'Guest Name', booking.guest_name || 'N/A', 50);
      
      // Mobile Number
      drawField(doc, 'Mobile Number', booking.mobile_number || 'N/A', 50);
      
      // Places
      drawField(doc, 'Places / Location', booking.places || 'N/A', 50);

      doc.moveDown(1);

      // ========== STAY DETAILS SECTION ==========
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('STAY DETAILS', 50);

      doc.moveDown(0.3);
      
      doc.strokeColor(primaryColor)
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown(0.8);

      // Arrival Date & Time
      const arrivalDate = booking.arrival_date || 'N/A';
      const arrivalTime = booking.arrival_time || '';
      const arrivalText = arrivalTime ? `${arrivalDate} at ${arrivalTime}` : arrivalDate;
      drawField(doc, 'Arrival Date & Time', arrivalText, 50);

      // Departure Date & Time
      const depDate = booking.departure_date || 'N/A';
      const depTime = booking.departure_time || '';
      const depText = depTime ? `${depDate} at ${depTime}` : depDate;
      drawField(doc, 'Departure Date & Time', depText, 50);

      // Room Type
      drawField(doc, 'Room Type', booking.room_type || 'N/A', 50);

      doc.moveDown(1);

      // ========== GUEST COUNT SECTION ==========
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('GUEST COUNT', 50);

      doc.moveDown(0.3);
      
      doc.strokeColor(primaryColor)
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown(0.8);

      // Two columns for guest count
      const gents = booking.gentlemen_count || booking.gentlemen || 0;
      const ladies = booking.ladies_count || booking.ladies || 0;
      const total = parseInt(gents) + parseInt(ladies);
      
      drawField(doc, "Gentlemen's Count", gents.toString(), 50);
      drawField(doc, "Ladies's Count", ladies.toString(), 50);
      drawField(doc, 'Total Guests', total.toString(), 50);

      doc.moveDown(1);

      // ========== REFERENCE SECTION ==========
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text('REFERENCE', 50);

      doc.moveDown(0.3);
      
      doc.strokeColor(primaryColor)
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown(0.8);

      drawField(doc, 'Sant Reference', booking.reference || 'N/A', 50);

      // ========== FOOTER ==========
      doc.moveDown(2);
      
      doc.fontSize(10)
        .font('Helvetica-Oblique')
        .fillColor('#718096')
        .text('This is a computer-generated document. No signature required.', 0, doc.y, { align: 'center' });

      doc.fontSize(9)
        .fillColor('#a0aec0')
        .text(`Generated on: ${new Date().toLocaleString()}`, 0, doc.y + 15, { align: 'center' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF and return as buffer (for web downloads)
 * @param {Object} bookingData - The structured booking JSON data
 * @returns {Promise<Buffer>} - PDF as buffer
 */
async function generateBookingPDFBuffer(bookingData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const booking = bookingData.booking || bookingData;
      
      const primaryColor = '#1a365d';
      const headerBgColor = '#2c5282';
      const labelColor = '#4a5568';
      const textColor = '#1a202c';

      // Helper function for buffer version
      function drawField(doc, label, value, x) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor(labelColor).text(label + ':', x);
        doc.fontSize(12).font('Helvetica').fillColor(textColor).text(value || 'N/A', x + 140);
        doc.moveDown(0.6);
      }

      // Header
      doc.rect(0, 0, 595, 80).fill(headerBgColor);
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff').text('BAPS UTRA CHITTI', 0, 30, { align: 'center' });
      doc.fontSize(12).font('Helvetica').fillColor('#e2e8f0').text('Booking Confirmation Form', 0, 55, { align: 'center' });

      // Guest Info
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('GUEST INFORMATION', 50);
      doc.moveDown(0.3);
      doc.strokeColor(primaryColor).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      drawField(doc, 'Guest Name', booking.guest_name || 'N/A', 50);
      drawField(doc, 'Mobile Number', booking.mobile_number || 'N/A', 50);
      drawField(doc, 'Places / Location', booking.places || 'N/A', 50);

      doc.moveDown(1);

      // Stay Details
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('STAY DETAILS', 50);
      doc.moveDown(0.3);
      doc.strokeColor(primaryColor).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      const arrivalText = (booking.arrival_date || '') + (booking.arrival_time ? ' at ' + booking.arrival_time : '');
      const depText = (booking.departure_date || '') + (booking.departure_time ? ' at ' + booking.departure_time : '');
      
      drawField(doc, 'Arrival Date & Time', arrivalText || 'N/A', 50);
      drawField(doc, 'Departure Date & Time', depText || 'N/A', 50);
      drawField(doc, 'Room Type', booking.room_type || 'N/A', 50);

      doc.moveDown(1);

      // Guest Count
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('GUEST COUNT', 50);
      doc.moveDown(0.3);
      doc.strokeColor(primaryColor).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      const gents = booking.gentlemen_count || booking.gentlemen || 0;
      const ladies = booking.ladies_count || booking.ladies || 0;
      drawField(doc, "Gentlemen's Count", gents.toString(), 50);
      drawField(doc, "Ladies's Count", ladies.toString(), 50);
      drawField(doc, 'Total Guests', (parseInt(gents) + parseInt(ladies)).toString(), 50);

      doc.moveDown(1);

      // Reference
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('REFERENCE', 50);
      doc.moveDown(0.3);
      doc.strokeColor(primaryColor).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      drawField(doc, 'Sant Reference', booking.reference || 'N/A', 50);

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#718096').text('This is a computer-generated document.', 0, doc.y, { align: 'center' });
      doc.fontSize(9).fillColor('#a0aec0').text(`Generated on: ${new Date().toLocaleString()}`, 0, doc.y + 15, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Example usage
async function main() {
  const sampleBookingData = {
    booking: {
      guest_name: "Upadhyay. Dharmesh .Ramesh bhai",
      places: "Gandhidham",
      mobile_number: "9999999999",
      arrival_date: "29/06/2025",
      arrival_time: "6:30 AM",
      departure_date: "30/06/2025",
      departure_time: "10:00 PM",
      gentlemen_count: 1,
      ladies_count: 2,
      room_type: "Non-Ac",
      reference: "Sadhu Achalmunidas"
    }
  };

  try {
    console.log('Generating booking request PDF...\n');
    
    const outputPath = await generateBookingPDF(sampleBookingData, 'booking-request.pdf');
    console.log(`✅ Booking PDF generated successfully!`);
    console.log(`📄 Saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error generating PDF:', error.message);
  }
}

// Export functions
module.exports = {
  generateBookingPDF,
  generateBookingPDFBuffer,
};

// Run if called directly
if (require.main === module) {
  main();
}
