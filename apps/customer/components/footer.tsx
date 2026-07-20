'use client';
import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@urban-assist/ui';
import { Plus, Minus } from 'lucide-react';
import { StoreBadges } from './store-badges';

const footerLinks = {
  COMPANY: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/coming-soon' },
    { label: 'Investor Relations', href: '/coming-soon' },
    { label: 'Blog', href: '/coming-soon' },
  ],
  LEGAL: [
    { label: 'Terms of Use', href: '/coming-soon' },
    { label: 'Privacy Policy', href: '/coming-soon' },
    { label: 'Cookie Policy', href: '/coming-soon' },
  ],
  'FOR PROVIDERS': [
    { label: 'Join as a Pro', href: '/coming-soon' },
    { label: 'Partner Login', href: '/coming-soon' },
    { label: 'Resource Centre', href: '/coming-soon' },
  ],
};

const PhoneMockup = () => (
  <div className="relative flex h-48 w-28 shrink-0 items-center justify-center rounded-3xl border-[3.5px] border-[#3A4D5C] bg-[#10202B] p-1.5 shadow-2xl">
    {/* Screen Content */}
    <div className="h-full w-full rounded-2xl bg-accent/15 flex flex-col justify-between p-2.5 border border-[#1A2D3C]">
      {/* Notch */}
      <div className="mx-auto h-2 w-8 rounded-full bg-[#3A4D5C]" />
      {/* Inner graphics */}
      <div className="flex-1 flex flex-col justify-center gap-2 mt-2">
        <div className="h-4 w-full bg-accent rounded flex items-center justify-center text-[7px] font-bold text-[#F5F1EB] uppercase font-display tracking-wider">
          Urban Assist
        </div>
        <div className="h-2 w-12 bg-white/20 rounded mx-auto" />
        <div className="h-6 w-full bg-white/10 rounded flex items-center justify-center text-[6px] text-[#9FB1BC] font-medium text-center leading-snug">
          Track Provider Live
        </div>
      </div>
      {/* Home Indicator */}
      <div className="mx-auto h-1 w-10 rounded-full bg-[#7E93A0]" />
    </div>
  </div>
);

export function Footer() {
  // Mobile accordion state
  const [openSection, setOpenSection] = React.useState<string | null>(null);

  const toggleSection = (heading: string) => {
    setOpenSection((prev) => (prev === heading ? null : heading));
  };

  return (
    <footer className="bg-[#1F3A4D] border-t border-hairline/20">
      {/* App Download Promo Banner */}
      <div className="mx-auto max-w-page px-6 pt-12">
        <div className="rounded-2xl bg-[#1A2D3C] border border-[#3A4D5C]/30 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 justify-between shadow-xl">
          <div className="flex items-center gap-5">
            <PhoneMockup />
            <div className="space-y-2">
              <span className="font-mono-utility text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2.5 py-1 rounded-full">
                Get the App
              </span>
              <h3 className="font-display text-lg md:text-xl font-bold text-[#F5F1EB] leading-tight">
                GET THE URBAN ASSIST APP
              </h3>
              <p className="text-xs text-[#9FB1BC] max-w-md leading-relaxed">
                Book services faster, track providers live, and manage your home with ease.
              </p>
              <StoreBadges className="hidden lg:flex pt-1" />
            </div>
          </div>

          {/* QR Code (Desktop Only) */}
          <div className="hidden lg:flex flex-col items-center gap-2 bg-[#10202B] p-4 rounded-xl border border-[#3A4D5C]/40">
            {/* Custom SVG QR Code Placeholder */}
            <svg className="h-16 w-16 text-[#F5F1EB]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8 0h6v6h-6V5zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8z" />
            </svg>
            <span className="text-[10px] font-mono-utility text-[#9FB1BC] uppercase tracking-wider font-semibold">
              Scan to Download
            </span>
          </div>

          {/* Mobile Download Buttons */}
          <StoreBadges className="lg:hidden w-full justify-center pt-2" />
        </div>
      </div>

      <div className="mx-auto max-w-page px-6 py-12">
        {/* DESKTOP VIEW: Link Columns (lg and up) */}
        <div className="hidden lg:grid grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo inverted />
              <span className="text-[15px] font-extrabold text-[#F5F1EB]">Urban Assist</span>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-[#9FB1BC]">
              Your trusted platform for home services across the UK. We connect you with verified professionals
              for cleaning, repairs, installations, and more.
            </p>
            <p className="mt-4 text-[12px] leading-relaxed text-[#9FB1BC]">
              128 City Road, London EC1V 2NX
              <br />
              Company No. 14892337
            </p>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-4 text-[13px] font-bold text-[#F5F1EB] uppercase tracking-wider">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[13px] text-[#9FB1BC] hover:text-white transition">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* MOBILE VIEW: Collapsible Accordion Columns (lg:hidden) */}
        <div className="lg:hidden space-y-3">
          {/* Brand Row */}
          <div className="pb-4">
            <div className="flex items-center gap-2.5">
              <Logo inverted />
              <span className="text-[15px] font-extrabold text-[#F5F1EB]">Urban Assist</span>
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => {
            const isOpen = openSection === heading;
            return (
              <div key={heading} className="border-b border-[#3A4D5C]/30 pb-3">
                <button
                  onClick={() => toggleSection(heading)}
                  className="w-full flex items-center justify-between text-left text-sm font-bold text-[#F5F1EB] uppercase tracking-wider py-1"
                >
                  <span>{heading}</span>
                  {isOpen ? (
                    <Minus className="h-4 w-4 text-[#9FB1BC]" />
                  ) : (
                    <Plus className="h-4 w-4 text-[#9FB1BC]" />
                  )}
                </button>
                {isOpen && (
                  <ul className="mt-3 pl-1 space-y-2.5">
                    {links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="text-xs text-[#9FB1BC] hover:text-white transition">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <hr className="my-8 border-0 h-[1px] bg-[#3A4D5C]/30" />

        {/* Bottom copyright & socials */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-[12px] text-[#7E93A0] text-center sm:text-left">
            &copy; 2026 Urban Assist Services Ltd. Registered in England &amp; Wales. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="/coming-soon" className="text-[#7E93A0] hover:text-[#F5F1EB] transition">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>
            <a href="/coming-soon" className="text-[#7E93A0] hover:text-[#F5F1EB] transition">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
