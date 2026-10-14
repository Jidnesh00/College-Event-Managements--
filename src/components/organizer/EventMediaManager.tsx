import React, { useState, useEffect } from 'react';
import { eventService } from '../../services/api';
import { EventMedia } from '../../types';
import { formatFileSize } from '../../utils/imageCompressor';
import { ImageUploadDropzone } from '../common/ImageUploadDropzone';
import {
  Image as ImageIcon,
  Star,
  Trash2,
  Plus,
  RefreshCw,
  Camera,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface EventMediaManagerProps {
  eventId: number | string;
  eventTitle: string;
  onBannerUpdated?: (newBannerUrl: string) => void;
}

export const EventMediaManager: React.FC<EventMediaManagerProps> = ({
  eventId,
  eventTitle,
  onBannerUpdated,
}) => {
  const [mediaList, setMediaList] = useState<EventMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for new upload
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newMediaType, setNewMediaType] = useState<'gallery' | 'banner'>('gallery');
  const [uploadMeta, setUploadMeta] = useState<{
    file_size: number;
    width: number;
    height: number;
    aspect_ratio: string;
  } | null>(null);

  useEffect(() => {
    loadMedia();
  }, [eventId]);

  async function loadMedia() {
    try {
      setLoading(true);
      const res = await eventService.getMedia(eventId);
      if (res.success) {
        setMediaList(res.media);
      }
    } catch (err) {
      console.error('[Media Manager] Failed to load event media:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl) {
      setActionMsg({ type: 'error', message: 'Please select or upload an image first.' });
      return;
    }

    try {
      setUploading(true);
      setActionMsg(null);

      const res = await eventService.uploadMedia(eventId, {
        image_url: newImageUrl,
        media_type: newMediaType,
        caption: newCaption.trim() || undefined,
        file_size: uploadMeta?.file_size,
        width: uploadMeta?.width,
        height: uploadMeta?.height,
        aspect_ratio: uploadMeta?.aspect_ratio,
        set_as_banner: newMediaType === 'banner',
      });

      if (res.success) {
        setActionMsg({
          type: 'success',
          message: newMediaType === 'banner'
            ? 'Event primary hero banner updated successfully!'
            : 'Photo saved to event gallery successfully.',
        });

        if (newMediaType === 'banner' && onBannerUpdated) {
          onBannerUpdated(newImageUrl);
        }

        // Reset form
        setNewImageUrl('');
        setNewCaption('');
        setUploadMeta(null);
        setShowUploadForm(false);
        loadMedia();
      }
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        message: err.response?.data?.message || 'Failed to upload event media.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSetAsBanner = async (mediaId: number) => {
    try {
      setActionMsg(null);
      const res = await eventService.setBanner(eventId, mediaId);
      if (res.success) {
        setActionMsg({ type: 'success', message: 'Primary banner updated!' });
        const promoted = mediaList.find((m) => m.id === mediaId);
        if (promoted && onBannerUpdated) {
          onBannerUpdated(promoted.image_url);
        }
        loadMedia();
      }
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update banner.',
      });
    }
  };

  const handleDelete = async (mediaId: number) => {
    if (!window.confirm('Are you sure you want to delete this media image?')) return;
    try {
      setActionMsg(null);
      const res = await eventService.deleteMedia(eventId, mediaId);
      if (res.success) {
        setActionMsg({ type: 'success', message: 'Image deleted from event gallery.' });
        setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
      }
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete media.',
      });
    }
  };

  const banners = mediaList.filter((m) => m.media_type === 'banner');
  const galleryPhotos = mediaList.filter((m) => m.media_type === 'gallery');

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 sm:p-6 space-y-6 shadow-2xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Event Media & Photo Gallery Manager</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage custom widescreen banners and high-resolution past event highlights for "{eventTitle}".
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showUploadForm ? 'Close Uploader' : 'Add Image / Photo'}</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMsg && (
        <div
          className={`p-3 rounded-md text-xs flex items-center gap-2 ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{actionMsg.message}</span>
        </div>
      )}

      {/* Upload Drawer / Form */}
      {showUploadForm && (
        <form
          onSubmit={handleUploadSubmit}
          className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Upload Asset
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Files are automatically compressed & aspect-ratio checked client-side
            </span>
          </div>

          {/* Media type toggle */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Role:</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNewMediaType('gallery')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  newMediaType === 'gallery'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Gallery Photo (Past Event Highlight)
              </button>
              <button
                type="button"
                onClick={() => setNewMediaType('banner')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  newMediaType === 'banner'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Primary Event Hero Banner (16:9)
              </button>
            </div>
          </div>

          {/* Compression & Dropzone Uploader */}
          <ImageUploadDropzone
            value={newImageUrl}
            targetRatio={newMediaType === 'banner' ? '16:9' : 'any'}
            label={newMediaType === 'banner' ? 'Select Hero Banner Image' : 'Select Photo for Gallery'}
            helperText={
              newMediaType === 'banner'
                ? 'High-resolution landscape photo (16:9 recommended for hero cards).'
                : 'Team photos, stage recaps, awards, or student participation moments.'
            }
            onChange={(dataUrl, meta) => {
              setNewImageUrl(dataUrl);
              if (meta) setUploadMeta(meta);
            }}
          />

          {/* Caption input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Caption / Context (Optional)
            </label>
            <input
              type="text"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="e.g. 2025 Technical Symposium: Team presentation to jury panel"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !newImageUrl}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-2xs disabled:opacity-60 flex items-center gap-1.5"
            >
              {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{uploading ? 'Compressing & Storing...' : 'Save to Event Media'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Media Content Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading media assets...</div>
      ) : mediaList.length === 0 ? (
        <div className="p-10 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
          <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">No media uploaded yet</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Upload custom banner art and past event highlights so prospective student attendees can preview event details.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary Banners Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Primary Event Hero Banner ({banners.length})</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {banners.map((media) => (
                <div
                  key={media.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs group flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={media.image_url}
                      alt={media.caption || 'Event banner'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-bold uppercase bg-indigo-600 text-white px-2 py-0.5 rounded shadow-2xs">
                        Active Banner
                      </span>
                    </div>
                  </div>

                  <div className="p-3 text-xs space-y-2">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {media.caption || 'Primary Hero Image'}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>{media.aspect_ratio || '16:9'} · {media.width}×{media.height}px</span>
                      <span>{formatFileSize(media.file_size || 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Event Photo Gallery Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Past Event Gallery & Campus Recaps ({galleryPhotos.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Shown to students on the public Event Details page
              </span>
            </div>

            {galleryPhotos.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                No gallery photos added yet. Click "+ Add Image / Photo" above to upload event recaps.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {galleryPhotos.map((media) => (
                  <div
                    key={media.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between group"
                  >
                    <div className="relative aspect-4/3 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img
                        src={media.image_url}
                        alt={media.caption || 'Gallery photo'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetAsBanner(media.id)}
                          className="px-2 py-1 bg-slate-900/80 hover:bg-indigo-600 text-white rounded text-[10px] font-semibold transition-colors"
                          title="Promote this photo to primary event banner"
                        >
                          Make Banner
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(media.id)}
                          className="p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded text-[10px] transition-colors"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 text-xs space-y-1.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                        {media.caption || 'Event highlight moment'}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>{media.aspect_ratio || '16:9'}</span>
                        <span>{formatFileSize(media.file_size || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
