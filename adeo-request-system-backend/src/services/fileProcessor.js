import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import util from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readFile = util.promisify(fs.readFile);

// Make sure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function extractTextFromFile(filePath, mimeType) {
  try {
    // Ensure the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const buffer = await readFile(filePath);
    let extractedText = '';
    
    switch (mimeType) {
      case 'application/pdf':
        try {
          const pdfData = await pdf(buffer);
          extractedText = pdfData.text;
        } catch (error) {
          console.error('Error parsing PDF:', error);
          throw new Error('Failed to parse PDF file');
        }
        break;
        
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        try {
          const { value } = await mammoth.extractRawText({ buffer });
          extractedText = value;
        } catch (error) {
          console.error('Error parsing Word document:', error);
          throw new Error('Failed to parse Word document');
        }
        break;
        
      case 'text/plain':
        extractedText = buffer.toString('utf-8');
        break;
        
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .trim();

    return extractedText;

  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw error;
  }
}

// Helper function to clean up old files
export async function cleanupOldFiles(maxAgeHours = 24) {
  try {
    const files = await fs.promises.readdir(uploadsDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.promises.stat(filePath);
      const fileAge = (now - stats.mtime.getTime()) / (1000 * 60 * 60); // Age in hours
      
      if (fileAge > maxAgeHours) {
        await fs.promises.unlink(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}

// Optional: Schedule cleanup of old files
export function scheduleFileCleanup(intervalHours = 24) {
  setInterval(() => {
    cleanupOldFiles(intervalHours)
      .catch(error => console.error('Scheduled file cleanup failed:', error));
  }, intervalHours * 60 * 60 * 1000);
}