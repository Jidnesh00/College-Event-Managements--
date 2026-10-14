export interface AspectRatioValidation {
  ratioDecimal: number;
  detectedRatio: string;
  isRecommended: boolean;
  message?: string;
}

export interface CompressedImageResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionSavingsPercent: number;
  width: number;
  height: number;
  aspectRatioLabel: string;
  validation: AspectRatioValidation;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  targetRatio?: '16:9' | '4:3' | '1:1' | 'any';
  autoCropToRatio?: boolean;
}

/**
 * Calculates human readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Validates aspect ratio against standard recommendations
 */
export function validateAspectRatio(
  width: number,
  height: number,
  targetRatio: '16:9' | '4:3' | '1:1' | 'any' = '16:9'
): AspectRatioValidation {
  const decimal = width / height;

  // Detect closest standard ratio
  let detected = 'Custom';
  if (Math.abs(decimal - 16 / 9) < 0.12) detected = '16:9';
  else if (Math.abs(decimal - 4 / 3) < 0.1) detected = '4:3';
  else if (Math.abs(decimal - 3 / 2) < 0.1) detected = '3:2';
  else if (Math.abs(decimal - 1) < 0.08) detected = '1:1 (Square)';
  else if (Math.abs(decimal - 9 / 16) < 0.12) detected = '9:16 (Vertical)';
  else if (Math.abs(decimal - 3 / 4) < 0.1) detected = '3:4 (Portrait)';

  if (targetRatio === 'any') {
    return {
      ratioDecimal: decimal,
      detectedRatio: detected,
      isRecommended: true,
    };
  }

  if (targetRatio === '16:9') {
    // Tolerates 1.55 to 1.95 for widescreen banners
    const isRecommended = decimal >= 1.55 && decimal <= 2.0;
    return {
      ratioDecimal: decimal,
      detectedRatio: detected,
      isRecommended,
      message: isRecommended
        ? 'Great! Aspect ratio conforms to 16:9 widescreen banners.'
        : `Detected ${detected} (${decimal.toFixed(2)}:1). Recommended for banners is 16:9 (~1.78:1) to prevent clipping on event cards.`,
    };
  }

  if (targetRatio === '1:1') {
    const isRecommended = Math.abs(decimal - 1) < 0.15;
    return {
      ratioDecimal: decimal,
      detectedRatio: detected,
      isRecommended,
      message: isRecommended
        ? 'Square aspect ratio verified.'
        : `Detected ${detected}. Recommended is 1:1 Square.`,
    };
  }

  if (targetRatio === '4:3') {
    const isRecommended = decimal >= 1.2 && decimal <= 1.45;
    return {
      ratioDecimal: decimal,
      detectedRatio: detected,
      isRecommended,
      message: isRecommended
        ? 'Standard 4:3 photo ratio verified.'
        : `Detected ${detected}. Recommended is 4:3.`,
    };
  }

  return {
    ratioDecimal: decimal,
    detectedRatio: detected,
    isRecommended: true,
  };
}

/**
 * Client-side high performance image compressor using HTMLCanvasElement
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1000,
    quality = 0.82,
    targetRatio = '16:9',
    autoCropToRatio = false,
  } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file.'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data.'));

      img.onload = () => {
        let origWidth = img.naturalWidth || img.width;
        let origHeight = img.naturalHeight || img.height;

        const validation = validateAspectRatio(origWidth, origHeight, targetRatio);

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = origWidth;
        let sourceHeight = origHeight;

        // Optional center crop to target ratio (e.g. 16:9)
        if (autoCropToRatio && targetRatio === '16:9') {
          const targetDecimal = 16 / 9;
          const currentDecimal = origWidth / origHeight;

          if (currentDecimal > targetDecimal) {
            // Image is too wide; crop sides
            sourceWidth = Math.round(origHeight * targetDecimal);
            sourceX = Math.round((origWidth - sourceWidth) / 2);
          } else if (currentDecimal < targetDecimal) {
            // Image is too tall; crop top & bottom
            sourceHeight = Math.round(origWidth / targetDecimal);
            sourceY = Math.round((origHeight - sourceHeight) / 2);
          }
        }

        // Scale down if exceeds max bounds while maintaining ratio
        let targetWidth = sourceWidth;
        let targetHeight = sourceHeight;

        if (targetWidth > maxWidth) {
          const scale = maxWidth / targetWidth;
          targetWidth = maxWidth;
          targetHeight = Math.round(targetHeight * scale);
        }

        if (targetHeight > maxHeight) {
          const scale = maxHeight / targetHeight;
          targetHeight = maxHeight;
          targetWidth = Math.round(targetWidth * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not initialize canvas context.'));
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw cropped / resized image
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );

        // Export as WebP or JPEG
        let mimeType = 'image/webp';
        let compressedDataUrl = canvas.toDataURL(mimeType, quality);

        // Fallback to jpeg if webp not supported
        if (!compressedDataUrl.startsWith('data:image/webp')) {
          mimeType = 'image/jpeg';
          compressedDataUrl = canvas.toDataURL(mimeType, quality);
        }

        // Calculate approximate byte size from base64 string
        const base64Length = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
        const compressedSize = Math.round((base64Length * 3) / 4);

        const savings = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

        resolve({
          dataUrl: compressedDataUrl,
          originalSize,
          compressedSize,
          compressionSavingsPercent: savings,
          width: targetWidth,
          height: targetHeight,
          aspectRatioLabel: validation.detectedRatio,
          validation,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
