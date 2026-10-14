import React, { useState } from 'react';
import { Modal } from './Modal';
import { registrationService } from '../../services/api';
import {
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface GoogleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formUrl: string;
  eventTitle: string;
  registrationId?: number | null;
  isCompleted?: boolean;
  onStatusChange?: (completed: boolean) => void;
}

export const GoogleFormModal: React.FC<GoogleFormModalProps> = ({
  isOpen,
  onClose,
  formUrl,
  eventTitle,
  registrationId,
  isCompleted = false,
  onStatusChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [completedState, setCompletedState] = useState(isCompleted);
  const [updating, setUpdating] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    setCompletedState(isCompleted);
  }, [isCompleted]);

  if (!formUrl) return null;

  const getEmbedUrl = (rawUrl: string): string => {
    try {
      const cleanUrl = rawUrl.trim();
      if (cleanUrl.includes('docs.google.com/forms')) {
        if (cleanUrl.includes('embedded=true')) return cleanUrl;
        return cleanUrl.includes('?') ? `${cleanUrl}&embedded=true` : `${cleanUrl}?embedded=true`;
      }
      return cleanUrl;
    } catch {
      return rawUrl;
    }
  };

  const embedSrc = getEmbedUrl(formUrl);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleComplete = async () => {
    if (!registrationId) return;
    try {
      setUpdating(true);
      const nextState = !completedState;
      const res = await registrationService.updateFormStatus(registrationId, nextState);
      if (res.success) {
        setCompletedState(nextState);
        onStatusChange?.(nextState);
        setStatusFeedback(nextState ? 'Marked as completed' : 'Marked as pending');
        setTimeout(() => setStatusFeedback(null), 2500);
      }
    } catch (err: any) {
      console.error('Failed to update form status', err);
      setStatusFeedback('Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Form"
      maxWidth="3xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2">
            {registrationId && (
              <button
                onClick={handleToggleComplete}
                disabled={updating}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  completedState
                    ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                    : 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 hover:bg-[#3B82F6]/25'
                }`}
              >
                {completedState ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Completed</span>
                  </>
                ) : (
                  <span>Mark as Completed</span>
                )}
              </button>
            )}

            {statusFeedback && (
              <span className="text-[11px] font-medium text-[#7C8BA8]">
                {statusFeedback}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="btn-secondary text-xs h-9"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5 mr-1 text-[#7C8BA8]" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs h-9"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div className="p-3.5 bg-[#111A2E] rounded-[10px] border border-[#1F2D4A] space-y-1">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-semibold text-[#F1F5F9] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#3B82F6]" />
              <span>Official Event Form</span>
            </h4>
            <span className="text-[11px] text-[#7C8BA8]">
              {eventTitle}
            </span>
          </div>
          <p className="text-[11px] text-[#7C8BA8] leading-relaxed">
            View the event form details directly below or open in a new tab.
          </p>
        </div>

        <div className="w-full h-[500px] rounded-[10px] overflow-hidden border border-[#1F2D4A] bg-[#0B1220]">
          <iframe
            src={embedSrc}
            title={`Form for ${eventTitle}`}
            className="w-full h-full border-0"
            loading="lazy"
          >
            Loading form...
          </iframe>
        </div>
      </div>
    </Modal>
  );
};
