import { Wrench, Sparkles, PaintBucket, Bug, Zap, Shirt, Wind, Shovel, Grid3X3, ArrowRight } from 'lucide-react';

const categories = [
  { name: "Women's Salon & Spa", icon: Sparkles, tag: 'Trending', color: '#C1622E' },
  { name: "Men's Salon & Massage", icon: Sparkles, tag: 'Popular', color: '#6B8F6B' },
  { name: 'Cleaning & Pest Control', icon: Bug, tag: 'Top rated', color: '#6B8F6B' },
  { name: 'Painting & Waterproofing', icon: PaintBucket, tag: 'Popular', color: '#1F3A4D' },
  { name: 'AC & Appliance Repair', icon: Wind, tag: 'Trending', color: '#C1622E' },
  { name: 'Electrician, Plumber & More', icon: Zap, tag: 'Popular', color: '#D9A441' },
  { name: 'Native Smart Products', icon: Wrench, tag: 'New', color: '#1F3A4D' },
  { name: 'All Services', icon: Grid3X3, tag: 'Browse', color: '#1F3A4D' },
];

export function CategoryGrid() {
  return (
    <section className="bg-bg py-12">
      <div className="mx-auto max-w-page px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[26px] font-extrabold text-ink">Explore our services</h2>
          <a
            href="/services"
            className="flex items-center gap-1 text-[14px] font-semibold text-accent hover:text-accent-hover"
          >
            View all <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <a
                key={cat.name}
                href={`/services?category=${cat.name.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                className="group card-shadow card overflow-hidden rounded-xl transition hover:border-accent"
                style={{ borderColor: '#ECE6D9' }}
              >
                {/* Image placeholder */}
                <div
                  className="flex h-36 items-center justify-center"
                  style={{
                    background:
                      'repeating-linear-gradient(135deg, #EDE6D8, #EDE6D8 10px, #E4DBC9 10px, #E4DBC9 20px)',
                  }}
                >
                  <Icon className="h-8 w-8 text-[#8A8574]/40" />
                </div>
                {/* Badge */}
                <div className="relative px-3 pb-3 pt-2">
                  {cat.tag && (
                    <span
                      className="absolute -top-3 left-3 rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-white"
                      style={{ background: cat.color }}
                    >
                      {cat.tag}
                    </span>
                  )}
                  <h3 className="mt-2 text-[14px] font-bold leading-tight text-ink">
                    {cat.name}
                  </h3>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
