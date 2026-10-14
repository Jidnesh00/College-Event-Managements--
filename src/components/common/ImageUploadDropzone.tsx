import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  X,
  FileImage,
  RefreshCw,
} from 'lucide-react';
import {
  compressImage,
  formatFileSize,
  CompressedImageResult,
} from '../../utils/imageCompressor';

interface ImageUploadDropzoneProps {
  value?: string;
  onChange: (dataUrl: string, metadata?: {
    file_size: number;
    width: number;
    height: number;
    aspect_ratio: string;
  }) => void;
  targetRatio?: '16:9' | '4:3' | '1:1' | 'any';
  label?: string;
  helperText?: string;
  maxDimension?: number;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  value,
  onChange,
  targetRatio = '16:9',
  label = 'Event Banner Image',
  helperText = 'Upload a custom high-resolution banner. Client-side compression automatically reduces file size.',
  maxDimension = 1600,
}) => {
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastResult, setLastResult] = useState<CompressedImageResult | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File, autoCrop: boolean = false) => {
    try {
      setCompressing(true);
      setErrorMsg(null);
      setLastFile(file);

      const result = await compressImage(file, {
        maxWidth: maxDimension,
        maxHeight: Math.round(maxDimension * 0.75),
        quality: 0.84,
        targetRatio,
        autoCropToRatio: autoCrop,
      });

      setLastResult(result);
      onChange(result.dataUrl, {
        file_size: result.compressedSize,
        width: result.width,
        height: result.height,
        aspect_ratio: result.aspectRatioLabel,
      });
    } catch (err: any) {
      console.error('[Image Compression Error]:', err);
      setErrorMsg(err.message || 'Failed to process and compress image.');
    } finally {
      setCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file, false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file, false);
    }
  };

  const handleApplySmartCrop = () => {
    if (lastFile) {
      processFile(lastFile, true);
    }
  };

  const handleClear = () => {
    setLastResult(null);
    setLastFile(null);
    setErrorMsg(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Main Upload Dropzone Area */}
      {!value ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-150 ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center text-slate-600 dark:text-slate-300">
              {compressing ? (
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : (
                <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {compressing ? 'Compressing & validating aspect ratio...' : 'Click or drag & drop image'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {helperText}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Preview Card */
        <div className="relative rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-900 group">
          <div className="relative aspect-video max-h-60 w-full overflow-hidden bg-black/40 flex items-center justify-center">
            <img
              src={value}
              alt="Uploaded preview"
              className="w-full h-full object-cover"
            />

            {/* Overlays */}
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-md bg-black/70 hover:bg-black text-white text-xs transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom info strip on image */}
            <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 p-2.5 text-white flex flex-wrap items-center justify-between gap-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-[11px]">
                {lastResult && (
                  <>
                    <span className="font-semibold bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                      {lastResult.aspectRatioLabel}
                    </span>
                    <span>
                      {lastResult.width} × {lastResult.height} px
                    </span>
                    <span>·</span>
                    <span>{formatFileSize(lastResult.compressedSize)}</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-semibold text-indigo-300 hover:text-white underline underline-offset-2"
              >
                Replace image
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Warning if ratio doesn't match and offer smart crop */}
      {lastResult && !lastResult.validation.isRecommended && targetRatio !== 'any' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">Aspect Ratio Notice:</span> Image is {lastResult.aspectRatioLabel} instead of recommended {targetRatio}.
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplySmartCrop}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
          >
            <Scissors className="w-3 h-3" />
            <span>Auto-Crop to {targetRatio}</span>
          </button>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
          {errorMsg}
        </p>
      )}
    </div>
  );
};
