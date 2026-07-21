'use client';
import * as React from 'react';
import { Card, Button } from '@urban-assist/ui';
import { Gift, Copy, Check, Share2, Mail, MessageCircle, Twitter } from 'lucide-react';

interface ReferralRow {
  id: string;
  email: string;
  name: string;
  status: 'Booked' | 'Pending';
  reward: string;
}

export function ReferralClient({
  referralCode,
  history,
}: {
  referralCode: string;
  history: ReferralRow[];
}) {
  const [copied, setCopied] = React.useState(false);

  const shareText = `Take a look at Urban Assist for trusted home services. My referral code is ${referralCode}.`;
  const shareUrl = 'https://urbanassist.co.uk';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Urban Assist Referral',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Refer a Friend</h1>
        <p className="text-sm text-muted mt-1">Share Urban Assist with friends and family.</p>
      </div>

      {/* Hero Gift Section */}
      <Card className="overflow-hidden border border-hairline bg-gradient-to-br from-ink via-ink to-ink/90 text-bg p-8 relative rounded-3xl flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 space-y-4 text-center md:text-left z-10">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            Invite friends to Urban Assist
          </h2>
          <p className="text-sm text-bg/85 max-w-md leading-relaxed">
            Share your unique referral code so friends can discover trusted local professionals.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 max-w-md justify-center md:justify-start">
            {/* Referral Code Bar */}
            <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-between px-4 py-3 select-all">
              <span className="font-mono text-sm font-bold tracking-widest text-bg uppercase select-all">
                {referralCode}
              </span>
              <button
                onClick={handleCopy}
                className="tap text-bg/75 hover:text-bg transition p-1"
                title="Copy Code"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <Button
              variant="outline"
              onClick={handleCopy}
              className="bg-white hover:bg-bg text-ink border-none hover:text-ink font-bold px-6 py-3 rounded-2xl"
            >
              {copied ? 'COPIED!' : 'COPY CODE'}
            </Button>
          </div>
        </div>

        {/* Gift Illustration */}
        <div className="w-32 h-32 shrink-0 bg-white/10 rounded-full flex items-center justify-center border border-white/15 shadow-inner animate-pulse">
          <Gift className="h-16 w-16 text-bg" />
        </div>
      </Card>

      {/* Share Triggers (Desktop) */}
      <div className="hidden md:grid grid-cols-3 gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border border-hairline hover:bg-bg/40 transition rounded-2xl p-4 font-semibold text-ink text-sm cursor-pointer"
        >
          <MessageCircle className="h-5 w-5 text-success" /> SHARE VIA WHATSAPP
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border border-hairline hover:bg-bg/40 transition rounded-2xl p-4 font-semibold text-ink text-sm cursor-pointer"
        >
          <Twitter className="h-5 w-5 text-accent" /> SHARE VIA TWITTER
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent('Take a look at Urban Assist')}&body=${encodeURIComponent(shareText + '\n\nVisit: ' + shareUrl)}`}
          className="flex items-center justify-center gap-2 border border-hairline hover:bg-bg/40 transition rounded-2xl p-4 font-semibold text-ink text-sm cursor-pointer"
        >
          <Mail className="h-5 w-5 text-muted" /> SHARE VIA EMAIL
        </a>
      </div>

      {/* Referral History Ledger */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-md text-ink">Your Referral History</h3>
        
        {history.length === 0 ? (
          <Card className="flex flex-col items-center py-10 gap-2 border border-hairline text-center">
            <Gift className="h-8 w-8 text-muted" />
            <p className="text-sm font-semibold text-ink">No referrals yet</p>
            <p className="text-xs text-muted">Codes shared will list here as soon as friends sign up.</p>
          </Card>
        ) : (
          <div className="border border-hairline rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bg/30 border-b border-hairline font-bold text-ink uppercase font-mono-utility">
                    <th className="px-5 py-3">Friend</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Reward Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-ink">
                  {history.map((row) => (
                    <tr key={row.id} className="hover:bg-bg/10 transition">
                      <td className="px-5 py-4">
                        <div className="font-semibold">{row.name}</div>
                        <div className="text-[10px] text-muted">{row.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.status === 'Booked'
                              ? 'bg-success/10 text-success'
                              : 'bg-accent/10 text-accent'
                          }`}
                        >
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-sm">
                        {row.reward}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:hidden flex gap-2">
        <Button variant="primary" className="w-full flex items-center justify-center gap-2" onClick={handleNativeShare}>
          <Share2 className="h-4 w-4" /> SHARE WITH FRIENDS
        </Button>
      </div>
    </div>
  );
}
