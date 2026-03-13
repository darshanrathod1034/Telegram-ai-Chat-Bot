const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a professional resume PDF from structured JSON data
 * @param {Object} resumeData - The structured resume JSON data
 * @param {string} outputPath - Path where the PDF will be saved
 * @returns {Promise<string>} - Path to the generated PDF
 */
async function generateResumePDF(resumeData, outputPath = 'resume.pdf') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: resumeData.resume?.contact?.name || 'Resume',
          Author: resumeData.resume?.contact?.name || 'Resume Generator',
        },
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const resume = resumeData.resume;
      const contact = resume?.contact || {};
      const primaryColor = '#1a365d';
      const secondaryColor = '#2d3748';
      const textColor = '#4a5568';

      // ========== HEADER SECTION ==========
      // Name
      doc.fontSize(28)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(contact.name || 'Your Name', { align: 'center' });

      // Contact Info Line
      const contactParts = [];
      if (contact.email) contactParts.push(contact.email);
      if (contact.phone) contactParts.push(contact.phone);
      if (contact.address) contactParts.push(contact.address);

      if (contactParts.length > 0) {
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor(textColor)
          .text(contactParts.join('  |  '), { align: 'center' });
      }

      doc.moveDown(0.5);

      // Divider line
      doc.strokeColor(primaryColor)
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown(1);

      // ========== OBJECTIVE SECTION ==========
      if (resume.objective) {
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('OBJECTIVE');

        doc.moveDown(0.3);

        doc.fontSize(10)
          .font('Helvetica')
          .fillColor(secondaryColor)
          .text(resume.objective, {
            align: 'justify',
            lineGap: 2,
          });

        doc.moveDown(1);
      }

      // ========== EDUCATION SECTION ==========
      if (resume.education && resume.education.length > 0) {
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('EDUCATION');

        doc.moveDown(0.3);

        resume.education.forEach((edu, index) => {
          // Degree and Major
          let eduText = '';
          if (edu.degree) eduText += edu.degree;
          if (edu.major) eduText += edu.degree ? ` in ${edu.major}` : edu.major;

          if (eduText) {
            doc.fontSize(11)
              .font('Helvetica-Bold')
              .fillColor(secondaryColor)
              .text(eduText);
          }

          // University and Year
          let uniText = '';
          if (edu.university) uniText += edu.university;
          if (edu.year) uniText += uniText ? ` | ${edu.year}` : edu.year;

          if (uniText) {
            doc.fontSize(10)
              .font('Helvetica')
              .fillColor(textColor)
              .text(uniText);
          }

          if (index < resume.education.length - 1) {
            doc.moveDown(0.5);
          }
        });

        doc.moveDown(1);
      }

      // ========== WORK EXPERIENCE SECTION ==========
      if (resume.work_experience && resume.work_experience.length > 0) {
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('WORK EXPERIENCE');

        doc.moveDown(0.3);

        resume.work_experience.forEach((work, index) => {
          // Title and Company
          let workTitle = '';
          if (work.title) workTitle += work.title;
          if (work.company) workTitle += work.company ? ` at ${work.company}` : '';

          if (workTitle) {
            doc.fontSize(11)
              .font('Helvetica-Bold')
              .fillColor(secondaryColor)
              .text(workTitle);
          }

          // Location and Year
          let locYear = '';
          if (work.location) locYear += work.location;
          if (work.year) locYear += locYear ? ` | ${work.year}` : work.year;

          if (locYear) {
            doc.fontSize(10)
              .font('Helvetica-Oblique')
              .fillColor(textColor)
              .text(locYear);
          }

          // Responsibilities
          if (work.responsibilities && work.responsibilities.length > 0) {
            doc.moveDown(0.3);
            doc.fontSize(10)
              .font('Helvetica')
              .fillColor(secondaryColor);

            work.responsibilities.forEach((resp) => {
              if (resp && resp.trim()) {
                doc.text(`• ${resp.trim()}`, {
                  indent: 20,
                  lineGap: 2,
                });
              }
            });
          }

          if (index < resume.work_experience.length - 1) {
            doc.moveDown(0.8);
          }
        });

        doc.moveDown(1);
      }

      // ========== SKILLS SECTION ==========
      if (resume.skills && resume.skills.length > 0) {
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('SKILLS');

        doc.moveDown(0.3);

        const skillsText = resume.skills
          .filter(skill => skill && skill.trim())
          .map(skill => skill.trim())
          .join('  •  ');

        doc.fontSize(10)
          .font('Helvetica')
          .fillColor(secondaryColor)
          .text(`• ${skillsText}`, {
            lineGap: 4,
          });

        doc.moveDown(1);
      }

      // ========== CERTIFICATIONS SECTION ==========
      if (resume.certifications && resume.certifications.length > 0) {
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('CERTIFICATIONS');

        doc.moveDown(0.3);

        resume.certifications.forEach((cert) => {
          let certText = '';
          if (cert.name) certText += cert.name;
          if (cert.issuing_organization) certText += cert.issuing_organization ? ` - ${cert.issuing_organization}` : '';
          if (cert.year) certText += cert.year ? ` (${cert.year})` : '';

          if (certText) {
            doc.fontSize(10)
              .font('Helvetica')
              .fillColor(secondaryColor)
              .text(`• ${certText}`);
          }
        });
      }

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
 * @param {Object} resumeData - The structured resume JSON data
 * @returns {Promise<Buffer>} - PDF as buffer
 */
async function generateResumePDFBuffer(resumeData) {
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

      // Use same rendering logic - inline the key parts
      const resume = resumeData.resume;
      const contact = resume?.contact || {};
      const primaryColor = '#1a365d';
      const secondaryColor = '#2d3748';
      const textColor = '#4a5568';

      // Header
      doc.fontSize(28).font('Helvetica-Bold').fillColor(primaryColor).text(contact.name || 'Your Name', { align: 'center' });

      const contactParts = [];
      if (contact.email) contactParts.push(contact.email);
      if (contact.phone) contactParts.push(contact.phone);
      if (contact.address) contactParts.push(contact.address);

      if (contactParts.length > 0) {
        doc.fontSize(10).font('Helvetica').fillColor(textColor).text(contactParts.join('  |  '), { align: 'center' });
      }

      doc.moveDown(0.5);
      doc.strokeColor(primaryColor).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Objective
      if (resume.objective) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('OBJECTIVE');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(resume.objective, { align: 'justify' });
        doc.moveDown(1);
      }

      // Education
      if (resume.education && resume.education.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('EDUCATION');
        doc.moveDown(0.3);
        resume.education.forEach((edu) => {
          let eduText = (edu.degree || '') + (edu.major ? ` in ${edu.major}` : '');
          if (eduText) doc.fontSize(11).font('Helvetica-Bold').fillColor(secondaryColor).text(eduText);
          let uniText = (edu.university || '') + (edu.year ? ` | ${edu.year}` : '');
          if (uniText) doc.fontSize(10).font('Helvetica').fillColor(textColor).text(uniText);
          doc.moveDown(0.5);
        });
        doc.moveDown(0.5);
      }

      // Work Experience
      if (resume.work_experience && resume.work_experience.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('WORK EXPERIENCE');
        doc.moveDown(0.3);
        resume.work_experience.forEach((work) => {
          let title = (work.title || '') + (work.company ? ` at ${work.company}` : '');
          if (title) doc.fontSize(11).font('Helvetica-Bold').fillColor(secondaryColor).text(title);
          let loc = (work.location || '') + (work.year ? ` | ${work.year}` : '');
          if (loc) doc.fontSize(10).font('Helvetica-Oblique').fillColor(textColor).text(loc);
          if (work.responsibilities) {
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica').fillColor(secondaryColor);
            work.responsibilities.forEach(r => { if (r && r.trim()) doc.text(`• ${r.trim()}`, { indent: 20 }); });
          }
          doc.moveDown(0.8);
        });
      }

      // Skills
      if (resume.skills && resume.skills.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('SKILLS');
        doc.moveDown(0.3);
        const skillsText = resume.skills.filter(s => s && s.trim()).map(s => s.trim()).join('  •  ');
        doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(`• ${skillsText}`);
        doc.moveDown(1);
      }

      // Certifications
      if (resume.certifications && resume.certifications.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('CERTIFICATIONS');
        doc.moveDown(0.3);
        resume.certifications.forEach((cert) => {
          let c = (cert.name || '') + (cert.issuing_organization ? ` - ${cert.issuing_organization}` : '') + (cert.year ? ` (${cert.year})` : '');
          if (c) doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(`• ${c}`);
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Example usage and test
async function main() {
  // Sample resume data (what your extraction function produces)
  const sampleResumeData = {
    resume: {
      contact: {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "123-456-7890",
        address: "1234 Elm Street, City, State, ZIP"
      },
      objective: "A highly motivated professional with 5 years of experience in sales and marketing, seeking to leverage expertise in team leadership and strategic planning to drive business growth.",
      education: [
        {
          degree: "Bachelor of Science",
          major: "Marketing",
          university: "XYZ University",
          year: "2010 - 2014"
        },
        {
          degree: "High School Diploma",
          major: "",
          university: "ABC High School",
          year: "2006 - 2010"
        }
      ],
      work_experience: [
        {
          title: "Sales Manager",
          company: "ABC Corporation",
          location: "City, State",
          year: "2015 - Present",
          responsibilities: [
            "Managed a team of 10 sales representatives",
            "Developed and implemented sales strategies",
            "Increased sales by 30% in the first year"
          ]
        },
        {
          title: "Marketing Coordinator",
          company: "XYZ Corporation",
          location: "City, State",
          year: "2013 - 2015",
          responsibilities: [
            "Created and executed marketing campaigns",
            "Monitored and reported on campaign performance",
            "Collaborated with cross-functional teams to achieve marketing goals"
          ]
        }
      ],
      skills: [
        "Sales",
        "Marketing",
        "Project Management",
        "Leadership",
        "Communication"
      ],
      certifications: [
        {
          name: "Certified Sales Professional (CSP)",
          issuing_organization: "XYZ Corporation",
          year: "2015"
        }
      ]
    }
  };

  try {
    console.log('Generating resume PDF...\n');
    
    const outputPath = await generateResumePDF(sampleResumeData, 'sample-resume.pdf');
    console.log(`✅ Resume PDF generated successfully!`);
    console.log(`📄 Saved to: ${outputPath}`);
    
    // Also show how to get it as a buffer for web downloads
    console.log('\n--- For Web Download ---');
    console.log('Use generateResumePDFBuffer() to get PDF as buffer');
    console.log('Then send it as response with proper headers:');
    console.log('res.setHeader("Content-Type", "application/pdf")');
    console.log('res.setHeader("Content-Disposition", "attachment; filename=resume.pdf")');
    console.log('res.send(buffer)');
    
  } catch (error) {
    console.error('Error generating PDF:', error.message);
  }
}

// Export functions
module.exports = {
  generateResumePDF,
  generateResumePDFBuffer,
};

// Run if called directly
if (require.main === module) {
  main();
}
