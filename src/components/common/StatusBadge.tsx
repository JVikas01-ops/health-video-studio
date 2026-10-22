import React, { useState } from 'react';
import { Copy, Check, CheckCircle2, Clock, AlertTriangle, XCircle, FileEdit } from 'lucide-react';
import type { ShotStatus, ApprovalStatus } from '../../types';

export const StatusBadge: React.FC<{ status: ShotStatus; className?: string }> = ({ status, className = '' }) => {
  switch (status) {
    case 'approved':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Approved
        </span>
      );
    case 'generated':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Generated
        </span>
      );
    case 'in_progress':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          In Progress
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/40 text-slate-400 border border-slate-600/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Planned
        </span>
      );
  }
};

export const ApprovalBadge: React.FC<{ status: ApprovalStatus; className?: string; labelPrefix?: string }> = ({
  status,
  className = '',
  labelPrefix = '',
}) => {
  switch (status) {
    case 'approved':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{labelPrefix ? `${labelPrefix}: ` : ''}Approved</span>
        </span>
      );
    case 'awaiting_approval':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse ${className}`}>
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{labelPrefix ? `${labelPrefix}: ` : ''}Awaiting Approval</span>
        </span>
      );
    case 'needs_revision':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          <span>{labelPrefix ? `${labelPrefix}: ` : ''}Needs Revision</span>
        </span>
      );
    case 'rejected':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 ${className}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>{labelPrefix ? `${labelPrefix}: ` : ''}Rejected</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}>
          <FileEdit className="w-3.5 h-3.5 text-slate-400" />
          <span>{labelPrefix ? `${labelPrefix}: ` : ''}Draft</span>
        </span>
      );
  }
};

export const PromptCopyButton: React.FC<{
  text: string;
  label?: string;
  className?: string;
}> = ({ text, label = 'Copy Prompt', className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors ${
        copied
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
      } ${className}`}
      title="Copy prompt text to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
};
