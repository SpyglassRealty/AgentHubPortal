import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, 'agent-photos');
const OUTPUT_DIR = path.join(__dirname, 'agent-photos-processed');
const BACKGROUND_STYLE = 'professional_gray';

// Professional gray gradient background
const GRADIENT_SVG = `
<svg width="800" height="800">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#e8e8e8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#grad)" />
</svg>`;

async function processAgentPhotos() {
  console.log('🎨 Starting batch background replacement...');
  console.log(`Style: ${BACKGROUND_STYLE} (Professional Gray Gradient)`);
  
  try {
    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Get all image files
    const files = await fs.readdir(INPUT_DIR);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    console.log(`📁 Found ${imageFiles.length} agent photos to process`);
    
    let processed = 0;
    let failed = 0;
    
    for (const file of imageFiles) {
      try {
        const inputPath = path.join(INPUT_DIR, file);
        const outputPath = path.join(OUTPUT_DIR, file.replace(/\.(jpg|jpeg|webp)$/i, '.png'));
        
        // Process the image
        await sharp(inputPath)
          .resize(800, 800, { 
            fit: 'cover',
            position: 'north' // Focus on upper body/face
          })
          .removeAlpha()
          .composite([
            {
              input: Buffer.from(GRADIENT_SVG),
              blend: 'dest-over' // Place gradient behind the person
            }
          ])
          .png({ quality: 90 })
          .toFile(outputPath);
        
        processed++;
        if (processed % 10 === 0) {
          console.log(`  Processed ${processed}/${imageFiles.length} photos...`);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${file}:`, error.message);
        failed++;
      }
    }
    
    console.log(`
✅ Batch processing complete!
   Processed: ${processed} photos
   Failed: ${failed} photos
   Output: ${OUTPUT_DIR}

Next steps:
1. Review the processed photos
2. Copy them to Mission Control: public/agent-photos/
3. They'll automatically be served when deployed
`);
    
  } catch (error) {
    console.error('❌ Batch processing error:', error);
  }
}

// Run the batch process
processAgentPhotos();