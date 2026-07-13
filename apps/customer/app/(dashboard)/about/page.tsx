import * as React from 'react';
import Link from 'next/link';
import { Card, Button } from '@urban-assist/ui';
import { ArrowLeft, Users, Star, MapPin, Briefcase } from 'lucide-react';

const AboutHero = () => (
  <div className="relative w-full h-48 md:h-60 rounded-2xl bg-gradient-to-br from-accent/90 to-[#1F3A4D] overflow-hidden flex items-center justify-center p-6 text-center border border-hairline/30 shadow-lg">
    <div className="space-y-2.5 z-10">
      <span className="font-mono-utility text-[10px] font-bold text-accent bg-[#F5F1EB] px-3 py-1 rounded-full uppercase tracking-wider">
        About Us
      </span>
      <h2 className="font-display text-2xl md:text-3xl font-extrabold text-[#F5F1EB] drop-shadow-sm">
        We make home care effortless.
      </h2>
      <p className="text-xs text-[#9FB1BC] max-w-sm mx-auto leading-relaxed">
        Connecting millions of households with vetted, reliable local professionals.
      </p>
    </div>
    {/* Decorative blur rings */}
    <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
    <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#9FB1BC]/10 blur-2xl" />
  </div>
);

export default function AboutPage() {
  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link href="/" className="tap flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-base font-bold text-ink">Our Company</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Hero Image / Banner */}
      <AboutHero />

      {/* Mission Section */}
      <section className="space-y-2.5">
        <h3 className="font-display text-xs font-bold text-muted uppercase tracking-wider pl-0.5">Our Mission</h3>
        <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card">
          <p className="font-display text-base font-bold text-ink leading-snug">
            To empower local professionals and bring reliable, vetted home services to every doorstep in the UK.
          </p>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            By building a secure, easy-to-use digital framework, we cut out the middlemen and match clients
            instantly with rated cleaners, plumbers, electricians, and handymen in their local areas.
          </p>
        </Card>
      </section>

      {/* Stats Section */}
      <section className="space-y-3">
        <h3 className="font-display text-xs font-bold text-muted uppercase tracking-wider pl-0.5">By The Numbers</h3>
        
        {/* DESKTOP STATS GRID (3 Columns) */}
        <div className="hidden lg:grid grid-cols-3 gap-4">
          <Card className="border border-hairline bg-white p-5 rounded-xl text-center space-y-1 shadow-card">
            <Users className="h-5 w-5 text-accent mx-auto" />
            <div className="font-display text-2xl font-extrabold text-ink">50,000+</div>
            <div className="text-xs text-muted font-medium">Jobs Completed</div>
          </Card>
          
          <Card className="border border-hairline bg-white p-5 rounded-xl text-center space-y-1 shadow-card">
            <Star className="h-5 w-5 text-amber fill-amber/10 mx-auto" />
            <div className="font-display text-2xl font-extrabold text-ink">4.8 / 5.0</div>
            <div className="text-xs text-muted font-medium">Average Rating</div>
          </Card>
          
          <Card className="border border-hairline bg-white p-5 rounded-xl text-center space-y-1 shadow-card">
            <MapPin className="h-5 w-5 text-accent mx-auto" />
            <div className="font-display text-2xl font-extrabold text-ink">10+</div>
            <div className="text-xs text-muted font-medium">UK Cities</div>
          </Card>
        </div>

        {/* MOBILE STATS GRID (2x2 Grid) */}
        <div className="grid lg:hidden grid-cols-2 gap-3">
          <Card className="border border-hairline bg-white p-4 rounded-xl text-center space-y-1 shadow-card">
            <div className="font-display text-lg font-extrabold text-ink">50k+ Jobs</div>
            <div className="text-[10px] text-muted">Completed</div>
          </Card>
          
          <Card className="border border-hairline bg-white p-4 rounded-xl text-center space-y-1 shadow-card">
            <div className="font-display text-lg font-extrabold text-ink">4.8 Rating</div>
            <div className="text-[10px] text-muted">Average Score</div>
          </Card>
          
          <Card className="border border-hairline bg-white p-4 rounded-xl text-center space-y-1 shadow-card">
            <div className="font-display text-lg font-extrabold text-ink">10+ Cities</div>
            <div className="text-[10px] text-muted">Service Areas</div>
          </Card>

          <Card className="border border-hairline bg-white p-4 rounded-xl text-center space-y-1 shadow-card">
            <div className="font-display text-lg font-extrabold text-ink">5k+</div>
            <div className="text-[10px] text-muted">Providers</div>
          </Card>
        </div>
      </section>

      {/* Join Our Mission Section */}
      <section className="space-y-2.5 pb-8">
        <h3 className="font-display text-xs font-bold text-muted uppercase tracking-wider pl-0.5">Join Our Mission</h3>
        <Card className="border border-hairline bg-white p-5 rounded-xl shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent shrink-0">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <div className="font-bold text-sm text-ink">
                <span className="lg:hidden">We're hiring!</span>
                <span className="hidden lg:inline">Join our mission</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                <span className="lg:hidden">Join a fast-growing team based in the heart of London.</span>
                <span className="hidden lg:inline">We are always looking for top talent.</span>
              </p>
            </div>
          </div>
          <Link href="/coming-soon" className="w-full md:w-auto">
            <Button className="w-full">
              <span className="lg:hidden">VIEW OPEN ROLES</span>
              <span className="hidden lg:inline">View careers</span>
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
