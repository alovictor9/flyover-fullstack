'use client';
import { useState } from 'react';
import { clsx } from 'clsx';
import { referralUrl } from '@/lib/config';
import { CopyButton, ShareButton } from '@/components/ui/misc';

const SOURCES = [
  { value: '', label: 'Any' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'x', label: 'X' },
  { value: 'youtube', label: 'YouTube' },
];

/** Shows the affiliate's tracked link with copy/share and optional source tagging (?source=…, recorded on each click). */
export function ReferralLinkBox({ code, title, compact }: { code: string; title: string; compact?: boolean }) {
  const [source, setSource] = useState('');
  const url = referralUrl(code, source || undefined);
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <code className="block min-w-0 truncate rounded-xl border border-line bg-mist px-3 py-2.5 text-sm text-navy-700" title={url}>
          {url}
        </code>
        <div className="flex gap-2">
          <CopyButton value={url} label="Copy link" className="h-10 flex-1" />
          <ShareButton url={url} title={title} className="h-10 flex-1 justify-center" />
        </div>
      </div>
      {!compact && (
        <div>
          <p className="mb-1.5 text-xs text-slate">Tag where you&apos;re sharing to see which channel performs best:</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Link source tag">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                role="radio"
                aria-checked={source === s.value}
                onClick={() => setSource(s.value)}
                className={clsx('rounded-full px-2.5 py-1 text-xs font-medium ring-1', source === s.value ? 'bg-navy-700 text-white ring-navy-700' : 'bg-white text-slate ring-line hover:text-navy-700')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
