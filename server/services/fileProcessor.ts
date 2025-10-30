import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
// pdfParse will be imported dynamically
import mammoth from 'mammoth';

// Re-export extractContactInformation from openai service
export { extractContactInformation } from './openai';

// Configure multer for file uploads
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedExtensions = ['.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  },
});

export interface ProcessedResumeContent {
  text: string;
  filename: string;
  fileType: 'pdf' | 'docx';
  fileSize: number;
}

export async function processResumeFile(file: any): Promise<ProcessedResumeContent> {
  try {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    let extractedText = '';

    if (fileExtension === '.pdf') {
      extractedText = await extractTextFromPDF(file.buffer);
    } else if (fileExtension === '.docx') {
      extractedText = await extractTextFromDOCX(file.buffer);
    } else {
      throw new Error('Unsupported file type');
    }

    return {
      text: extractedText,
      filename: file.originalname,
      fileType: fileExtension.slice(1) as 'pdf' | 'docx',
      fileSize: file.size,
    };
  } catch (error) {
    throw new Error(`Failed to process resume file: ${(error as Error).message}`);
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${(error as Error).message}`);
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to extract DOCX text: ${(error as Error).message}`);
  }
}

export async function generateResumeDocument(content: any, format: 'pdf' | 'docx'): Promise<Buffer> {
  if (format === 'pdf') {
    return generatePDFResume(content);
  } else {
    return generateDOCXResume(content);
  }
}

function generatePDFResume(content: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {

      
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'LETTER'
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width - 100; // Account for margins
      
      // Header with actual contact information prominently displayed in body
      const contact = content.contact || {};
      const contactName = contact.name || 'Professional Name';
      const contactTitle = contact.title || 'Database Administrator';
      const contactPhone = contact.phone || '';
      const contactEmail = contact.email || '';
      const contactLocation = [contact.city, contact.state].filter(Boolean).join(', ') || '';
      const contactLinkedIn = contact.linkedin || '';
      
      // Name - largest, most prominent
      doc.fontSize(28).fillColor('#1a365d').text(contactName, { align: 'center' });
      
      // Professional title
      doc.fontSize(16).fillColor('#2d3748').text(contactTitle, { align: 'center' });
      doc.moveDown(0.3);
      
      // Contact details in resume body (not just header)
      const contactDetails = [contactPhone, contactEmail, contactLocation, contactLinkedIn].filter(Boolean).join(' | ');
      if (contactDetails) {
        doc.fontSize(11).fillColor('#4a5568').text(contactDetails, { align: 'center' });
      }
      
      // Add a subtle line separator
      doc.moveTo(50, doc.y + 10).lineTo(pageWidth + 50, doc.y + 10).stroke('#e2e8f0');
      doc.moveDown(1);

      // Professional Summary
      if (content.summary) {
        doc.fontSize(16).fillColor('#2d3748').text('PROFESSIONAL SUMMARY');
        doc.moveTo(50, doc.y + 2).lineTo(pageWidth + 50, doc.y + 2).stroke('#3182ce');
        doc.moveDown(0.4);
        doc.fontSize(11).fillColor('#4a5568').text(content.summary, { 
          align: 'justify',
          lineGap: 2
        });
        doc.moveDown(0.8);
      }

      // Core Competencies (Skills in a simple, clean layout)
      if (content.skills && content.skills.length > 0) {
        doc.fontSize(16).fillColor('#2d3748').text('CORE COMPETENCIES');
        doc.moveTo(50, doc.y + 2).lineTo(pageWidth + 50, doc.y + 2).stroke('#3182ce');
        doc.moveDown(0.4);
        
        // Simple bullet list layout that works reliably
        content.skills.forEach((skill: string) => {
          doc.fontSize(11).fillColor('#4a5568').text(`• ${skill}`);
          doc.moveDown(0.2);
        });
        
        doc.moveDown(0.8);
      }

      // Professional Experience
      if (content.experience && content.experience.length > 0) {
        doc.fontSize(16).fillColor('#2d3748').text('PROFESSIONAL EXPERIENCE');
        doc.moveTo(50, doc.y + 2).lineTo(pageWidth + 50, doc.y + 2).stroke('#3182ce');
        doc.moveDown(0.4);

        content.experience.forEach((exp: any, index: number) => {
          // Ensure we have valid experience data
          const title = exp.title || exp.position || 'Position';
          const company = exp.company || exp.employer || 'Company';
          const duration = exp.duration || exp.dates || '';
          
          // Job title and company on separate lines for better formatting
          doc.fontSize(13).fillColor('#2d3748').text(`${title} | ${company}`);
          
          if (duration) {
            doc.fontSize(11).fillColor('#718096').text(duration);
          }
          doc.moveDown(0.3);

          // Handle achievements/responsibilities/description/bullets
          const achievements = exp.achievements || exp.responsibilities || exp.description || exp.bullets || [];
          if (achievements && achievements.length > 0) {
            achievements.forEach((achievement: string) => {
              // Remove existing bullet if present to avoid double bullets
              const cleanAchievement = achievement.replace(/^[•\-\*]\s*/, '');
              doc.fontSize(11).fillColor('#4a5568').text(`• ${cleanAchievement}`, {
                lineGap: 2,
                width: pageWidth - 20
              });
              doc.moveDown(0.2);
            });
          }
          
          if (index < content.experience.length - 1) {
            doc.moveDown(0.6);
          }
        });
        doc.moveDown(0.8);
      }

      // Technical Proficiencies
      if (content.keywords && content.keywords.length > 0) {
        doc.fontSize(16).fillColor('#2d3748').text('TECHNICAL PROFICIENCIES');
        doc.moveTo(50, doc.y + 2).lineTo(pageWidth + 50, doc.y + 2).stroke('#3182ce');
        doc.moveDown(0.4);
        
        // Group keywords by category if possible
        const keywordsText = content.keywords.join(' • ');
        doc.fontSize(11).fillColor('#4a5568').text(keywordsText, { 
          align: 'justify',
          lineGap: 2
        });
        doc.moveDown(0.6);
      }

      // Certifications section (only from actual resume data)
      if (content.certifications && content.certifications.length > 0) {
        doc.fontSize(16).fillColor('#2d3748').text('CERTIFICATIONS');
        doc.moveTo(50, doc.y + 2).lineTo(pageWidth + 50, doc.y + 2).stroke('#3182ce');
        doc.moveDown(0.4);
        
        content.certifications.forEach((cert: any) => {
          // Ensure cert is converted to string, handle object serialization issues
          const certText = typeof cert === 'string' ? cert : (cert?.name || cert?.title || String(cert));
          if (certText && certText !== '[object Object]') {
            doc.fontSize(11).fillColor('#4a5568').text(`• ${certText}`);
            doc.moveDown(0.2);
          }
        });
        doc.moveDown(0.6);
      }

      // Professional Development section (only from actual resume data)
      if (content.professionalDevelopment && content.professionalDevelopment.length > 0) {
        doc.fontSize(16).fillColor('#2d3748').text('PROFESSIONAL DEVELOPMENT');
        doc.moveTo(50, doc.y + 2).lineTo(pageWidth + 50, doc.y + 2).stroke('#3182ce');
        doc.moveDown(0.4);
        
        content.professionalDevelopment.forEach((training: any) => {
          // Ensure training is converted to string, handle object serialization issues
          const trainingText = typeof training === 'string' ? training : (training?.name || training?.title || String(training));
          if (trainingText && trainingText !== '[object Object]') {
            doc.fontSize(11).fillColor('#4a5568').text(`• ${trainingText}`);
            doc.moveDown(0.2);
          }
        });
        doc.moveDown(0.6);
      }

      // Education section
      if (content.education && content.education.length > 0) {
        doc.fontSize(16).fillColor('#2d3748').text('EDUCATION');
        doc.moveTo(50, doc.y + 2).lineTo(pageWidth + 50, doc.y + 2).stroke('#3182ce');
        doc.moveDown(0.4);
        
        content.education.forEach((edu: any) => {
          const eduText = typeof edu === 'string' ? edu : (edu?.degree || edu?.school || String(edu));
          if (eduText && eduText !== '[object Object]') {
            doc.fontSize(11).fillColor('#4a5568').text(`• ${eduText}`);
            doc.moveDown(0.2);
          }
        });
      }

      doc.end();
    } catch (error) {
      reject(new Error(`Failed to generate PDF: ${(error as Error).message}`));
    }
  });
}

async function generateDOCXResume(content: any): Promise<Buffer> {
  try {
    const children = [];

    // Header with actual contact information prominently in body
    const contact = content.contact || {};
    const contactName = contact.name || 'Professional Name';
    const contactTitle = contact.title || 'Database Administrator';
    const contactPhone = contact.phone || '';
    const contactEmail = contact.email || '';
    const contactLocation = [contact.city, contact.state].filter(Boolean).join(', ') || '';
    const contactLinkedIn = contact.linkedin || '';
    
    // Name - largest, most prominent in document body (32 half-points = 16pt)
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactName,
            size: 32, // 16pt
            bold: true,
            color: "1a365d"
          })
        ],
        alignment: "center",
        spacing: { after: 160 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: contactTitle,
            size: 26, // 13pt - improved size for better hierarchy
            color: "2d3748",
            bold: true
          })
        ],
        alignment: "center",
        spacing: { after: 180 }
      })
    );
    
    // Contact details in document body with better formatting and spacing
    const contactLines = [];
    if (contactPhone && contactEmail) {
      contactLines.push(`${contactPhone} | ${contactEmail}`);
    }
    if (contactLocation && contactLinkedIn) {
      contactLines.push(`${contactLocation} | ${contactLinkedIn}`);
    } else if (contactLocation) {
      contactLines.push(contactLocation);
    } else if (contactLinkedIn) {
      contactLines.push(contactLinkedIn);
    }
    
    contactLines.forEach((line, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24, // 12pt
              color: "4a5568"
            })
          ],
          alignment: "center",
          spacing: { 
            after: index === contactLines.length - 1 ? 400 : 120 // More space after last contact line
          }
        })
      );
    });

    // Professional Summary
    if (content.summary) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "PROFESSIONAL SUMMARY",
              size: 28, // 14pt
              bold: true,
              color: "2d3748"
            })
          ],
          spacing: { before: 200, after: 150 },
          border: {
            bottom: {
              color: "3182ce",
              size: 1,
              style: "single",
              space: 1
            }
          }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: content.summary,
              size: 22, // 11pt
              color: "2d3748"
            })
          ],
          spacing: { after: 300 },
          alignment: "both"
        })
      );
    }

    // Core Competencies
    if (content.skills && content.skills.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "CORE COMPETENCIES", 
              size: 28, // 14pt
              bold: true,
              color: "2d3748"
            })
          ],
          spacing: { before: 200, after: 150 },
          border: {
            bottom: {
              color: "3182ce",
              size: 1,
              style: "single",
              space: 1
            }
          }
        })
      );

      // Create bullet points for skills
      content.skills.forEach((skill: string) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${skill}`,
                size: 22, // 11pt
                color: "2d3748"
              })
            ],
            spacing: { after: 50 }
          })
        );
      });

      children.push(
        new Paragraph({
          text: "",
          spacing: { after: 200 }
        })
      );
    }

    // Professional Experience
    if (content.experience && content.experience.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "PROFESSIONAL EXPERIENCE",
              size: 28, // 14pt
              bold: true,
              color: "2d3748"
            })
          ],
          spacing: { before: 200, after: 150 },
          border: {
            bottom: {
              color: "3182ce",
              size: 1,
              style: "single",
              space: 1
            }
          }
        })
      );

      content.experience.forEach((exp: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.title,
                size: 26, // 13pt
                bold: true,
                color: "2d3748"
              }),
              new TextRun({
                text: ` | ${exp.company}`,
                size: 26, // 13pt
                bold: true,
                color: "3182ce"
              })
            ],
            spacing: { after: 100 }
          })
        );

        if (exp.duration) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: exp.duration,
                  size: 22, // 11pt
                  italics: true,
                  color: "4a5568"
                })
              ],
              spacing: { after: 150 }
            })
          );
        }

        const achievements = exp.achievements || exp.responsibilities || exp.description || exp.bullets || [];
        if (achievements && achievements.length > 0) {
          achievements.forEach((achievement: string) => {
            // Remove existing bullet if present to avoid double bullets
            const cleanAchievement = achievement.replace(/^[•\-\*]\s*/, '');
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${cleanAchievement}`,
                    size: 22, // 11pt
                    color: "2d3748"
                  })
                ],
                spacing: { after: 80 },
                alignment: "both"
              })
            );
          });
        }

        children.push(
          new Paragraph({
            text: "",
            spacing: { after: 200 }
          })
        );
      });
    }

    // Technical Proficiencies
    if (content.keywords && content.keywords.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "TECHNICAL PROFICIENCIES",
              size: 28, // 14pt
              bold: true,
              color: "2d3748"
            })
          ],
          spacing: { before: 200, after: 150 },
          border: {
            bottom: {
              color: "3182ce",
              size: 1,
              style: "single",
              space: 1
            }
          }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: content.keywords.join(' • '),
              size: 22, // 11pt
              color: "2d3748"
            })
          ],
          spacing: { after: 300 },
          alignment: "both"
        })
      );
    }

    // Certifications (only from actual resume data)
    if (content.certifications && content.certifications.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "CERTIFICATIONS",
              size: 28, // 14pt
              bold: true,
              color: "2d3748"
            })
          ],
          spacing: { before: 200, after: 150 },
          border: {
            bottom: {
              color: "3182ce",
              size: 1,
              style: "single",
              space: 1
            }
          }
        })
      );

      content.certifications.forEach((cert: any) => {
        // Ensure cert is converted to string, handle object serialization issues
        const certText = typeof cert === 'string' ? cert : (cert?.name || cert?.title || String(cert));
        if (certText && certText !== '[object Object]') {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${certText}`,
                  size: 22, // 11pt
                  color: "2d3748"
                })
              ],
              spacing: { after: 80 }
            })
          );
        }
      });
    }

    // Professional Development (only from actual resume data)
    if (content.professionalDevelopment && content.professionalDevelopment.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "PROFESSIONAL DEVELOPMENT",
              size: 28, // 14pt
              bold: true,
              color: "2d3748"
            })
          ],
          spacing: { before: 200, after: 150 },
          border: {
            bottom: {
              color: "3182ce",
              size: 1,
              style: "single",
              space: 1
            }
          }
        })
      );

      content.professionalDevelopment.forEach((training: any) => {
        // Ensure training is converted to string, handle object serialization issues
        const trainingText = typeof training === 'string' ? training : (training?.name || training?.title || String(training));
        if (trainingText && trainingText !== '[object Object]') {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${trainingText}`,
                  size: 22, // 11pt
                  color: "2d3748"
                })
              ],
              spacing: { after: 80 }
            })
          );
        }
      });
    }

    // Education
    if (content.education && content.education.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "EDUCATION",
              size: 28, // 14pt
              bold: true,
              color: "2d3748"
            })
          ],
          spacing: { before: 200, after: 150 },
          border: {
            bottom: {
              color: "3182ce",
              size: 1,
              style: "single",
              space: 1
            }
          }
        })
      );

      content.education.forEach((edu: any) => {
        const eduText = typeof edu === 'string' ? edu : (edu?.degree || edu?.school || String(edu));
        if (eduText && eduText !== '[object Object]') {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${eduText}`,
                  size: 22, // 11pt
                  color: "2d3748"
                })
              ],
              spacing: { after: 80 }
            })
          );
        }
      });
    }

    // Always add Education section from user preferences if not already included
    if (!content.education || content.education.length === 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "EDUCATION",
              size: 28, // 14pt
              bold: true,
              color: "2d3748"
            })
          ],
          spacing: { before: 200, after: 150 },
          border: {
            bottom: {
              color: "3182ce",
              size: 1,
              style: "single",
              space: 1
            }
          }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "• Bachelor of Science - University of Gondar",
              size: 22, // 11pt
              color: "2d3748"
            })
          ],
          spacing: { after: 200 }
        })
      );
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1008,   // 0.7 inch - more professional spacing
              right: 1008,
              bottom: 1008,
              left: 1008,
            },
          },
        },
        children: children
      }]
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    throw new Error(`Failed to generate DOCX: ${(error as Error).message}`);
  }
}

export function validateProfileJSON(jsonString: string): any {
  try {
    const profile = JSON.parse(jsonString);
    
    // Basic validation - in production, use a proper schema validator
    const requiredFields = ['personalInfo', 'experience', 'skills'];
    for (const field of requiredFields) {
      if (!profile[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return profile;
  } catch (error) {
    throw new Error(`Invalid profile JSON: ${(error as Error).message}`);
  }
}
