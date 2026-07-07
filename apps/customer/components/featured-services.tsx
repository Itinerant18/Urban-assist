import { ShoppingCart, Sparkles, Wrench, Wind, ShowerHead, ChefHat } from 'lucide-react';

const nativeProducts = [
  { name: 'Smart Water Purifier', price: '£299', icon: ShowerHead },
  { name: 'Smart Lock Pro', price: '£149', icon: Wrench },
  { name: 'Air Purifier', price: '£199', icon: Wind },
  { name: 'Smart Kitchen Scale', price: '£79', icon: ChefHat },
];

const trendingServices = [
  { name: 'Full Home Deep Cleaning', rate: '£80/hr', icon: Sparkles },
  { name: 'Washing Machine Repair', rate: '£55', icon: Wrench },
  { name: 'AC Service & Repair', rate: '£65', icon: Wind },
  { name: 'Bathroom Waterproofing', rate: '£120', icon: ShowerHead },
];

export function FeaturedServices() {
  return (
    <section className="bg-bg py-12">
      <div className="mx-auto max-w-page px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Native Smart Products */}
          <div className="rounded-2xl p-6" style={{ background: '#EEEAFF', border: '1px solid #E2DACB' }}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[20px] font-extrabold text-ink">Native Smart Products</h3>
              <a href="/services?category=smart-products" className="text-[13px] font-semibold text-accent">
                View all
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {nativeProducts.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.name}
                    className="flex flex-col items-center rounded-xl border border-hairline bg-white p-4 text-center"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-lg bg-ink/5">
                      <Icon className="h-6 w-6 text-ink" />
                    </div>
                    <span className="mt-2 text-[13px] font-bold text-ink">{p.name}</span>
                    <span className="mt-1 text-[14px] font-extrabold text-ink">{p.price}</span>
                    <button className="mt-2 flex items-center gap-1 rounded-lg border border-input-border px-3 py-1.5 text-[11px] font-bold text-accent transition hover:bg-accent hover:text-white">
                      <ShoppingCart className="h-3 w-3" /> Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trending Services */}
          <div className="rounded-2xl p-6" style={{ background: '#E8F0E8', border: '1px solid #E2DACB' }}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[20px] font-extrabold text-ink">Trending Services</h3>
              <a href="/services" className="text-[13px] font-semibold text-accent">
                View all
              </a>
            </div>
            <ul className="divide-y divide-hairline">
              {trendingServices.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.name} className="flex items-center gap-4 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10">
                      <Icon className="h-5 w-5 text-accent" />
                    </span>
                    <div className="flex-1">
                      <span className="text-[14px] font-bold text-ink">{s.name}</span>
                    </div>
                    <span className="text-[14px] font-extrabold text-ink">{s.rate}</span>
                    <button className="flex shrink-0 items-center gap-1 rounded-lg border border-input-border px-3 py-1.5 text-[11px] font-bold text-accent transition hover:bg-accent hover:text-white">
                      <ShoppingCart className="h-3 w-3" /> Add
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
