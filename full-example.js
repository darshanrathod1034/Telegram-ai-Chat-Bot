const { extractResumeData } = require('./extractResume');
const { generateResumePDF, generateResumePDFBuffer } = require('./generateResumePDF');

/**
 * Complete workflow: Extract resume data from raw text and generate PDF
 * @param {string} rawText - Raw resume text from user
 * @param {string} outputPath - Where to save the PDF
 * @param {Object} ollamaOptions - Options for Ollama (model, baseUrl)
 * @returns {Promise<string>} - Path to generated PDF
 */
async function extractAndGeneratePDF(rawText, outputPath = 'resume.pdf', ollamaOptions = {}) {
  // Step 1: Extract structured data from raw text using Ollama
  console.log('Step 1: Extracting resume data...');
  const resumeData = await extractResumeData(rawText, ollamaOptions);
  console.log('✅ Data extracted successfully!\n');

  // Step 2: Generate PDF from structured data
  console.log('Step 2: Generating PDF...');
  const pdfPath = await generateResumePDF(resumeData, outputPath);
  console.log(`✅ PDF generated: ${pdfPath}`);

  return pdfPath;
}

/**
 * Example: Use with Express.js for web download
 */
async function expressExample() {
  // This shows how to integrate with Express.js web server
  /*
  const express = require('express');
  const app = express();

  app.get('/download-resume', async (req, res) => {
    const rawText = req.body.resumeText; // Get raw text from request
    
    // Extract data
    const resumeData = await extractResumeData(rawText);
    
    // Generate PDF buffer
    const buffer = await generateResumePDFBuffer(resumeData);
    
    // Send as downloadable file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
    res.send(buffer);
  });

  app.listen(3000, () => console.log('Server running on port 3000'));
  */
  console.log('See code comments for Express.js integration example');
}

// Demo with sample data
async function main() {
  const rawResumeText = `
John Doe
123-456-7890
john.doe@example.com
1234 Elm Street, City, State, ZIP

Objective:
A highly motivated professional with 5 years of experience in sales and marketing.

Education:
Bachelor of Science in Marketing, XYZ University, 2010 - 2014
High School Diploma, ABC High School, 2006 - 2010

Work Experience:
Sales Manager, ABC Corporation, City, State, 2015 - Present
- Managed a team of 10 sales representatives
- Developed and implemented sales strategies
- Increased sales by 30% in the first year

Marketing Coordinator, XYZ Corporation, City, State, 2013 - 2015
- Created and executed marketing campaigns
- Monitored and reported on campaign performance

Skills:
Sales
Marketing
Project Management
Leadership
Communication

Certifications:
Certified Sales Professional (CSP), XYZ Corporation, 2015
  `;

  console.log('=== Complete Resume Extraction & PDF Generation ===\n');

  try {
    // Method 1: Full workflow (extract + generate)
    console.log('Running full workflow...\n');
    const pdfPath = await extractAndGeneratePDF(rawResumeText, 'my-resume.pdf');
    console.log(`\n🎉 Done! PDF saved to: ${pdfPath}`);

    // Method 2: Separate steps (for more control)
    console.log('\n--- Alternative: Separate Steps ---\n');
    
    // Step 1: Extract
    const extractedData = await extractResumeData(rawResumeText);
    console.log('Extracted JSON:');
    console.log(JSON.stringify(extractedData, null, 2));

    // Step 2: Generate PDF
    await generateResumePDF(extractedData, 'resume-separate.pdf');
    console.log('\n✅ Second PDF generated: resume-separate.pdf');

    // Method 3: For web/Express (returns buffer)
    console.log('\n--- For Web/Express ---\n');
    const buffer = await generateResumePDFBuffer(extractedData);
    console.log(`PDF Buffer size: ${buffer.length} bytes`);
console.log('with Express.js to allow direct downloads');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Export for use in other modules
module.exports = {
  extractAndGeneratePDF,
  expressExample,
};

// Run if called directly
if (require.main === module) {
  main();
}
