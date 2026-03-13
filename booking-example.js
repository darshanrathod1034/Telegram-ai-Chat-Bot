const { extractBookingData } = require('./extractBooking');
const { generateBookingPDF, generateBookingPDFBuffer } = require('./generateBookingPDF');

/**
 * Complete workflow: Extract booking data from raw text and generate PDF
 * @param {string} rawText - Raw booking request text from user
 * @param {string} outputPath - Where to save the PDF
 * @param {Object} ollamaOptions - Options for Ollama (model, baseUrl)
 * @returns {Promise<string>} - Path to generated PDF
 */
async function extractAndGenerateBookingPDF(rawText, outputPath = 'booking-request.pdf', ollamaOptions = {}) {
  // Step 1: Extract structured data from raw text using Ollama
  console.log('Step 1: Extracting booking data...');
  const bookingData = await extractBookingData(rawText, ollamaOptions);
  console.log('✅ Data extracted successfully!\n');

  // Step 2: Generate PDF from structured data
  console.log('Step 2: Generating PDF...');
  const pdfPath = await generateBookingPDF(bookingData, outputPath);
  console.log(`✅ PDF generated: ${pdfPath}`);

  return pdfPath;
}

// Demo with sample data
async function main() {
  const rawBookingText = `
Name : Darshan Rathod
Places : Gandhidham
Mobile Number : 6352381371
Arrival Date :29/06/2025 6:30 AM
Departure Date : 30/06/2025  10: 00 pm
Gent's : 01
Ladies : 02
Room (Non-Ac)
Sant Reference: Sadhu Achalmunidas
  `;

  console.log('=== Hotel Booking Extraction & PDF Generation ===\n');

  try {
    // Method 1: Full workflow (extract + generate)
    console.log('Running full workflow...\n');
    const pdfPath = await extractAndGenerateBookingPDF(rawBookingText, 'my-booking.pdf');
    console.log(`\n🎉 Done! PDF saved to: ${pdfPath}`);

    // Method 2: Separate steps (for more control)
    console.log('\n--- Alternative: Separate Steps ---\n');
    
    // Step 1: Extract
    const extractedData = await extractBookingData(rawBookingText);
    console.log('Extracted JSON:');
    console.log(JSON.stringify(extractedData, null, 2));

    // Step 2: Generate PDF
    await generateBookingPDF(extractedData, 'booking-separate.pdf');
    console.log('\n✅ Second PDF generated: booking-separate.pdf');

    // Method 3: For web/Express (returns buffer)
    console.log('\n--- For Web/Express ---\n');
    const buffer = await generateBookingPDFBuffer(extractedData);
    console.log(`PDF Buffer size: ${buffer.length} bytes`);
    console.log('Use this with Express.js to allow direct downloads');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Export for use in other modules
module.exports = {
  extractAndGenerateBookingPDF,
};

// Run if called directly
if (require.main === module) {
  main();
}
