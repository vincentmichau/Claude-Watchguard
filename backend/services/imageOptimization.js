// backend/services/imageOptimization.js - Image compression and optimization

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

/**
 * Optimize uploaded image
 * @param {String} inputPath - Input file path
 * @param {Object} options - Optimization options
 * @returns {Object} - Optimization results
 */
export const optimizeImage = async (inputPath, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 85,
    format = 'jpeg',
    generateThumbnail = true,
    thumbnailSize = 200
  } = options;

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Resize if needed
    let resized = image;
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      resized = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Optimize based on format
    let optimized;
    const outputPath = inputPath.replace(/\.[^.]+$/, `.${format}`);
    
    switch (format) {
      case 'jpeg':
      case 'jpg':
        optimized = resized.jpeg({ quality, progressive: true });
        break;
      case 'png':
        optimized = resized.png({ quality, compressionLevel: 9 });
        break;
      case 'webp':
        optimized = resized.webp({ quality });
        break;
      default:
        optimized = resized;
    }

    await optimized.toFile(outputPath);

    // Generate thumbnail
    let thumbnailPath = null;
    if (generateThumbnail) {
      thumbnailPath = inputPath.replace(/\.[^.]+$/, `_thumb.${format}`);
      await sharp(inputPath)
        .resize(thumbnailSize, thumbnailSize, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
    }

    // Get file sizes
    const originalSize = (await fs.stat(inputPath)).size;
    const optimizedSize = (await fs.stat(outputPath)).size;
    const compressionRatio = ((1 - optimizedSize / originalSize) * 100).toFixed(2);

    // Delete original if different from optimized
    if (inputPath !== outputPath) {
      await fs.unlink(inputPath);
    }

    return {
      success: true,
      originalSize,
      optimizedSize,
      compressionRatio: `${compressionRatio}%`,
      savedBytes: originalSize - optimizedSize,
      outputPath,
      thumbnailPath,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      }
    };

  } catch (error) {
    console.error('Image optimization error:', error);
    throw new Error(`Failed to optimize image: ${error.message}`);
  }
};

/**
 * Batch optimize multiple images
 * @param {Array} files - Array of file paths
 * @param {Object} options - Optimization options
 * @returns {Array} - Array of optimization results
 */
export const batchOptimizeImages = async (files, options = {}) => {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await optimizeImage(file, options);
      results.push({ file, ...result });
    } catch (error) {
      results.push({ 
        file, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  return results;
};

/**
 * Convert image to multiple formats
 * @param {String} inputPath - Input file path
 * @param {Array} formats - Array of target formats
 * @returns {Object} - Generated files
 */
export const convertToMultipleFormats = async (inputPath, formats = ['jpeg', 'webp']) => {
  const results = {};
  
  for (const format of formats) {
    try {
      const outputPath = inputPath.replace(/\.[^.]+$/, `.${format}`);
      
      let converter = sharp(inputPath);
      
      switch (format) {
        case 'jpeg':
        case 'jpg':
          await converter.jpeg({ quality: 85, progressive: true }).toFile(outputPath);
          break;
        case 'png':
          await converter.png({ quality: 85 }).toFile(outputPath);
          break;
        case 'webp':
          await converter.webp({ quality: 85 }).toFile(outputPath);
          break;
        case 'avif':
          await converter.avif({ quality: 85 }).toFile(outputPath);
          break;
      }
      
      results[format] = outputPath;
    } catch (error) {
      console.error(`Conversion to ${format} failed:`, error);
    }
  }
  
  return results;
};

/**
 * Generate responsive image sizes
 * @param {String} inputPath - Input file path
 * @param {Array} sizes - Array of widths [320, 640, 1024, 1920]
 * @returns {Array} - Generated responsive images
 */
export const generateResponsiveSizes = async (inputPath, sizes = [320, 640, 1024, 1920]) => {
  const results = [];
  const ext = path.extname(inputPath);
  const base = inputPath.replace(ext, '');
  
  for (const width of sizes) {
    try {
      const outputPath = `${base}_${width}w${ext}`;
      
      await sharp(inputPath)
        .resize(width, null, { withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);
      
      const size = (await fs.stat(outputPath)).size;
      
      results.push({
        width,
        path: outputPath,
        size
      });
    } catch (error) {
      console.error(`Generate ${width}w failed:`, error);
    }
  }
  
  return results;
};

/**
 * Get image metadata
 * @param {String} inputPath - Input file path
 * @returns {Object} - Image metadata
 */
export const getImageMetadata = async (inputPath) => {
  try {
    const metadata = await sharp(inputPath).metadata();
    const stats = await fs.stat(inputPath);
    
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size)
    };
  } catch (error) {
    throw new Error(`Failed to get image metadata: ${error.message}`);
  }
};

/**
 * Format bytes to human readable
 * @param {Number} bytes
 * @returns {String}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Middleware for automatic image optimization
 */
export const imageOptimizationMiddleware = (options = {}) => {
  return async (req, res, next) => {
    if (!req.file) {
      return next();
    }

    try {
      const result = await optimizeImage(req.file.path, options);
      
      // Update req.file with optimized version
      req.file.path = result.outputPath;
      req.file.size = result.optimizedSize;
      req.file.thumbnail = result.thumbnailPath;
      req.file.compressionRatio = result.compressionRatio;
      
      next();
    } catch (error) {
      console.error('Image optimization middleware error:', error);
      // Continue even if optimization fails
      next();
    }
  };
};
