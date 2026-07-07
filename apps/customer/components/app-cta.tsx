export function AppCTA() {
  return (
    <section style={{ background: '#1F3A4D' }}>
      <div className="mx-auto flex max-w-page flex-col items-center gap-6 px-6 py-14 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <h2 className="text-[22px] font-extrabold text-[#F5F1EB]">
            Get the Urban Assist app
          </h2>
          <p className="mt-2 text-[14px] text-[#9FB1BC]">
            Book, track, and pay — all from your phone
          </p>
        </div>
        <div className="flex gap-4">
          <a
            href="/coming-soon"
            className="rounded-xl bg-white/10 px-5 py-3 text-[13px] font-bold text-white backdrop-blur transition hover:bg-white/20"
          >
            App Store
          </a>
          <a
            href="/coming-soon"
            className="rounded-xl bg-white/10 px-5 py-3 text-[13px] font-bold text-white backdrop-blur transition hover:bg-white/20"
          >
            Google Play
          </a>
        </div>
      </div>
    </section>
  );
}
