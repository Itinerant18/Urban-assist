import Link from 'next/link';

const footerLinks = {
  Company: ['About Us', 'Careers', 'Blog', 'Investor Relations', 'Terms & Conditions', 'Privacy Policy'],
  'For Customers': ['How It Works', 'Categories Near Me', 'Contact Us', 'Help Centre', 'Safety', 'Coupons'],
  'For Professionals': ['Partner With Us', 'Partner App', 'Resource Centre', 'Community Forum'],
};

export function Footer() {
  return (
    <footer style={{ background: '#1F3A4D' }}>
      <div className="mx-auto max-w-page px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="block h-9 w-9 rounded-[9px] border border-white/20 bg-hairline/20" />
              <span className="text-[15px] font-extrabold text-[#F5F1EB]">Urban Assist</span>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed" style={{ color: '#9FB1BC' }}>
              Your trusted platform for home services across the UK. We connect you with
              verified professionals for cleaning, repairs, installations, and more.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-4 text-[14px] font-bold" style={{ color: '#F5F1EB' }}>
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <Link
                      href="/coming-soon"
                      className="text-[13px] transition hover:text-white"
                      style={{ color: '#9FB1BC' }}
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <hr className="my-8 border-0" style={{ height: '1px', background: 'rgba(245,241,235,0.14)' }} />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-[12px]" style={{ color: '#7E93A0' }}>
            &copy; 2026 Urban Assist Services Ltd. Registered in England &amp; Wales. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="/coming-soon" className="text-[12px]" style={{ color: '#7E93A0' }}>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
            </a>
            <a href="/coming-soon" className="text-[12px]" style={{ color: '#7E93A0' }}>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
            </a>
            <a href="/coming-soon" className="text-[12px]" style={{ color: '#7E93A0' }}>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zm-.5 3h-2.5a3 3 0 00-3 3v2.5H11v3h2V19h3v-7.5h2.5v-3H16V9c0-.5.5-1 1-1h1.5V6z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
