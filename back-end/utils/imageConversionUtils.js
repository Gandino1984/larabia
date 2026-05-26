import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

/**
 * Process and optimize an uploaded image: convert to WebP and ensure size < maxSizeKB.
 */
export async function processUploadedImage(file, maxSizeKB = 1024) {
  if (!file || !file.path) {
    throw new Error('No file provided for processing');
  }

  console.log('Processing uploaded image:', {
    filename: file.filename,
    size: Math.round(file.size / 1024) + 'KB',
    mimetype: file.mimetype
  });

  try {
    await fs.access(file.path);

    const originalPath = file.path;
    const directory = path.dirname(originalPath);
    const baseName = path.basename(file.filename, path.extname(file.filename));
    const newFilename = `${baseName}.webp`;
    const newPath = path.join(directory, newFilename);

    let quality = 85;
    let width = 1200;
    let height = 1200;
    let outputBuffer;
    let attempts = 0;
    const maxAttempts = 10;
    const maxSizeBytes = maxSizeKB * 1024;

    const metadata = await sharp(originalPath).metadata();

    if (metadata.width > width || metadata.height > height) {
      const ratio = Math.min(width / metadata.width, height / metadata.height);
      width = Math.floor(metadata.width * ratio);
      height = Math.floor(metadata.height * ratio);
    } else {
      width = metadata.width;
      height = metadata.height;
    }

    while (attempts < maxAttempts) {
      attempts++;

      outputBuffer = await sharp(originalPath)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      const outputSize = outputBuffer.length;
      console.log(`Attempt ${attempts}: q=${quality}, ${width}x${height} → ${Math.round(outputSize / 1024)}KB`);

      if (outputSize <= maxSizeBytes) break;

      if (quality > 30) {
        quality = Math.max(quality - 10, 30);
      } else {
        width = Math.floor(width * 0.9);
        height = Math.floor(height * 0.9);
        quality = 70;
        if (width < 400 || height < 400) {
          console.warn('Cannot optimize further without significant quality loss');
          break;
        }
      }
    }

    await fs.writeFile(newPath, outputBuffer);
    await fs.access(newPath);

    if (originalPath !== newPath) {
      try { await fs.unlink(originalPath); } catch (err) { console.error('Error deleting original:', err); }
    }

    const stats = await fs.stat(newPath);

    return {
      ...file,
      filename: newFilename,
      path: newPath,
      size: stats.size,
      mimetype: 'image/webp'
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

export async function deleteImageFile(imagePath, deleteEmptyDir = false) {
  try {
    await fs.access(imagePath);
    await fs.unlink(imagePath);

    if (deleteEmptyDir) {
      const directory = path.dirname(imagePath);
      const files = await fs.readdir(directory);
      if (files.length === 0) {
        await fs.rmdir(directory);
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting image file:', error);
    return false;
  }
}

export default { processUploadedImage, deleteImageFile };
