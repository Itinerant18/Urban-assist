import { StoreBadges } from './store-badges';

export function AppCTA() {
  return (
    <section style={{ background: '#1F3A4D' }}>
      <div className="mx-auto flex max-w-page flex-col items-center gap-8 px-6 py-14 lg:flex-row lg:justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Phone mockup placeholder */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="h-44 w-24 rounded-3xl border-[3px] border-[#3A4D5C] bg-[#10202B] p-1.5">
              <div
                className="h-full w-full rounded-2xl"
                style={{
                  background:
                    'repeating-linear-gradient(135deg,#EDE6D8,#EDE6D8 10px,#E4DBC9 10px,#E4DBC9 20px)',
                }}
              />
            </div>
            <span className="font-mono-utility text-[10px] text-[#9FB1BC]">app screenshot</span>
          </div>
          <div>
            <h2 className="text-[22px] font-extrabold text-[#F5F1EB]">
              Get the Urban Assist app
            </h2>
            <p className="mt-2 text-[14px] text-[#9FB1BC]">
              Book, track, and pay — all from your phone
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <StoreBadges />
          {/* QR code placeholder */}
          <div className="hidden lg:flex flex-col items-center gap-2">
            <div className="rounded-lg bg-white border border-[#3A4D5C] p-2">
              <svg className="h-14 w-14 text-[#1F3A4D]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8 0h6v6h-6V5zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8z" />
              </svg>
            </div>
            <span className="font-mono-utility text-[10px] text-[#9FB1BC] uppercase tracking-wider">
              Scan to download
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
