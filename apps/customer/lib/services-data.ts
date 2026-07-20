import {
  Sparkles,
  Wrench,
  Zap,
  Settings,
  Hammer,
  Paintbrush,
  Bug,
  Shovel,
  Home,
  Droplets,
  Flame,
  Key,
  Truck,
  Box,
  PenTool,
  Brush,
  TreePine,
  Shield,
  Snowflake,
  Factory,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ── Icon mapping ─────────────────────────────────────────────── */
/* Keyed by the icon-name strings used in `category.icon` / `subcategory.icon` below. */

export const categoryIcons: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  brush: Brush,
  wrench: Wrench,
  settings: Settings,
  flame: Flame,
  zap: Zap,
  shield: Shield,
  hammer: Hammer,
  tool: PenTool,
  home: Home,
  paintbrush: Paintbrush,
  'tree-pine': TreePine,
  shovel: Shovel,
  bug: Bug,
  house: Home,
  key: Key,
  truck: Truck,
  box: Box,
  factory: Factory,
  snowflake: Snowflake,
  droplets: Droplets,
};

/* ── Type definitions ────────────────────────────────────────── */

export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  minPricePence: number;
  maxPricePence: number;
  durationMins: number;
  icon?: string;
  imageUrl?: string;
  isPopular?: boolean;
  tags?: string[];
}

export interface Subcategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  services: ServiceItem[];
  sortOrder: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  subcategories: Subcategory[];
  minPricePence: number;
  maxPricePence: number;
  sortOrder: number;
  color?: string;
  imageUrl?: string;
}

/* ── Full Service Taxonomy ───────────────────────────────────── */

export const SERVICE_CATEGORIES: Category[] = [
  {
    id: 'cleaning',
    slug: 'cleaning',
    name: 'Cleaning Services',
    description: 'Professional cleaning for every room and occasion',
    icon: 'sparkles',
    color: '#6B8F6B',
    minPricePence: 1500,
    maxPricePence: 15000,
    sortOrder: 1,
    subcategories: [
      {
        id: 'home-cleaning',
        slug: 'home-cleaning',
        name: 'Home Cleaning',
        description: 'Regular and deep cleaning for homes and flats',
        icon: 'sparkles',
        sortOrder: 1,
        services: [
          { id: 'regular-house-cleaning', slug: 'regular-house-cleaning', name: 'Regular House Cleaning', description: 'Weekly, fortnightly or monthly maintenance cleaning', minPricePence: 1500, maxPricePence: 4000, durationMins: 120, isPopular: true },
          { id: 'deep-cleaning', slug: 'deep-cleaning', name: 'Deep Cleaning', description: 'Thorough top-to-bottom clean for a fresh start', minPricePence: 2500, maxPricePence: 8000, durationMins: 240, isPopular: true },
          { id: 'end-of-tenancy-cleaning', slug: 'end-of-tenancy-cleaning', name: 'End of Tenancy Cleaning', description: 'Guaranteed deposit-ready clean for moving out', minPricePence: 3000, maxPricePence: 12000, durationMins: 300 },
          { id: 'move-in-move-out-cleaning', slug: 'move-in-move-out-cleaning', name: 'Move-in/Move-out Cleaning', description: 'Fresh start or spotless handover for your new home', minPricePence: 2500, maxPricePence: 8000, durationMins: 240 },
          { id: 'spring-cleaning', slug: 'spring-cleaning', name: 'Spring Cleaning', description: 'Seasonal deep refresh for the whole home', minPricePence: 3000, maxPricePence: 10000, durationMins: 300 },
        ],
      },
      {
        id: 'kitchen-cleaning',
        slug: 'kitchen-cleaning',
        name: 'Kitchen Cleaning',
        description: 'Specialist cleaning for kitchen appliances and surfaces',
        icon: 'sparkles',
        sortOrder: 2,
        services: [
          { id: 'deep-kitchen-cleaning', slug: 'deep-kitchen-cleaning', name: 'Deep Kitchen Cleaning', description: 'Complete kitchen degrease and sanitise', minPricePence: 1500, maxPricePence: 3500, durationMins: 120 },
          { id: 'oven-cleaning', slug: 'oven-cleaning', name: 'Oven Cleaning', description: 'Professional oven, hob and extractor valet', minPricePence: 800, maxPricePence: 2000, durationMins: 90, isPopular: true },
          { id: 'extractor-hood-cleaning', slug: 'extractor-hood-cleaning', name: 'Extractor Hood Cleaning', description: 'Filter replacement and deep degrease', minPricePence: 600, maxPricePence: 1500, durationMins: 60 },
          { id: 'fridge-cleaning', slug: 'fridge-cleaning', name: 'Fridge Cleaning', description: 'Deep clean and sanitise fridge/freezer', minPricePence: 500, maxPricePence: 1200, durationMins: 60 },
        ],
      },
      {
        id: 'bathroom-cleaning',
        slug: 'bathroom-cleaning',
        name: 'Bathroom Cleaning',
        description: 'Deep clean and limescale removal for bathrooms',
        icon: 'sparkles',
        sortOrder: 3,
        services: [
          { id: 'bathroom-deep-clean', slug: 'bathroom-deep-clean', name: 'Bathroom Deep Clean', description: 'Full bathroom sanitise and shine', minPricePence: 1000, maxPricePence: 2500, durationMins: 90 },
          { id: 'limescale-removal', slug: 'limescale-removal', name: 'Limescale Removal', description: 'Specialist treatment for taps, tiles and shower screens', minPricePence: 800, maxPricePence: 2000, durationMins: 60 },
          { id: 'tile-grout-cleaning', slug: 'tile-grout-cleaning', name: 'Tile & Grout Cleaning', description: 'Steam clean and restore grout lines', minPricePence: 1200, maxPricePence: 3000, durationMins: 120 },
        ],
      },
      {
        id: 'carpet-upholstery',
        slug: 'carpet-upholstery',
        name: 'Carpet & Upholstery',
        description: 'Professional fabric and carpet cleaning',
        icon: 'brush',
        sortOrder: 4,
        services: [
          { id: 'carpet-cleaning', slug: 'carpet-cleaning', name: 'Carpet Cleaning', description: 'Hot water extraction for carpets and rugs', minPricePence: 1500, maxPricePence: 5000, durationMins: 120, isPopular: true },
          { id: 'rug-cleaning', slug: 'rug-cleaning', name: 'Rug Cleaning', description: 'Delicate and oriental rug specialist clean', minPricePence: 2000, maxPricePence: 6000, durationMins: 120 },
          { id: 'sofa-cleaning', slug: 'sofa-cleaning', name: 'Sofa Cleaning', description: 'Fabric and leather sofa deep clean', minPricePence: 1200, maxPricePence: 3500, durationMins: 90 },
          { id: 'mattress-cleaning', slug: 'mattress-cleaning', name: 'Mattress Cleaning', description: 'Sanitise and remove stains from mattresses', minPricePence: 800, maxPricePence: 2000, durationMins: 60 },
          { id: 'curtain-cleaning', slug: 'curtain-cleaning', name: 'Curtain Cleaning', description: 'In-situ or removal clean for curtains and blinds', minPricePence: 1000, maxPricePence: 3000, durationMins: 90 },
        ],
      },
      {
        id: 'window-cleaning',
        slug: 'window-cleaning',
        name: 'Window Cleaning',
        description: 'Internal and external window cleaning services',
        icon: 'sparkles',
        sortOrder: 5,
        services: [
          { id: 'internal-windows', slug: 'internal-windows', name: 'Internal Windows', description: 'Streak-free clean for interior glass', minPricePence: 800, maxPricePence: 2000, durationMins: 60 },
          { id: 'external-windows', slug: 'external-windows', name: 'External Windows', description: 'Reach-and-wash system for exterior glass', minPricePence: 1000, maxPricePence: 3000, durationMins: 90 },
          { id: 'conservatory-cleaning', slug: 'conservatory-cleaning', name: 'Conservatory Cleaning', description: 'Roof and frame clean for conservatories', minPricePence: 1500, maxPricePence: 4000, durationMins: 120 },
          { id: 'gutter-cleaning', slug: 'gutter-cleaning', name: 'Gutter Cleaning', description: 'Clear debris and flush downpipes', minPricePence: 1000, maxPricePence: 2500, durationMins: 90 },
        ],
      },
    ],
  },
  {
    id: 'plumbing',
    slug: 'plumbing',
    name: 'Plumbing',
    description: 'Leaks, blockages, installations and emergency repairs',
    icon: 'wrench',
    color: '#C1622E',
    minPricePence: 3500,
    maxPricePence: 30000,
    sortOrder: 2,
    subcategories: [
      {
        id: 'plumbing-repairs',
        slug: 'plumbing-repairs',
        name: 'Repairs',
        description: 'Fix leaks, drips and faulty fixtures',
        icon: 'wrench',
        sortOrder: 1,
        services: [
          { id: 'tap-repair', slug: 'tap-repair', name: 'Tap Repair', description: 'Fix dripping, leaking or stiff taps', minPricePence: 3500, maxPricePence: 8000, durationMins: 60, isPopular: true },
          { id: 'pipe-leak-repair', slug: 'pipe-leak-repair', name: 'Pipe Leak Repair', description: 'Locate and repair leaking pipes', minPricePence: 5000, maxPricePence: 15000, durationMins: 120 },
          { id: 'toilet-repair', slug: 'toilet-repair', name: 'Toilet Repair', description: 'Fix running, leaking or blocked toilets', minPricePence: 3500, maxPricePence: 8000, durationMins: 90 },
          { id: 'shower-repair', slug: 'shower-repair', name: 'Shower Repair', description: 'Fix electric, mixer or power showers', minPricePence: 4000, maxPricePence: 10000, durationMins: 90 },
          { id: 'sink-repair', slug: 'sink-repair', name: 'Sink Repair', description: 'Unblock, reseal or replace kitchen/bathroom sinks', minPricePence: 3000, maxPricePence: 7000, durationMins: 60 },
        ],
      },
      {
        id: 'plumbing-installations',
        slug: 'plumbing-installations',
        name: 'Installations',
        description: 'New fixtures and appliance plumbing',
        icon: 'settings',
        sortOrder: 2,
        services: [
          { id: 'tap-installation', slug: 'tap-installation', name: 'Tap Installation', description: 'Fit new kitchen or bathroom taps', minPricePence: 4000, maxPricePence: 10000, durationMins: 90 },
          { id: 'toilet-installation', slug: 'toilet-installation', name: 'Toilet Installation', description: 'Supply and fit new WC suite', minPricePence: 5000, maxPricePence: 15000, durationMins: 180 },
          { id: 'basin-installation', slug: 'basin-installation', name: 'Basin Installation', description: 'Fit pedestal, countertop or wall-hung basin', minPricePence: 4000, maxPricePence: 10000, durationMins: 120 },
          { id: 'shower-installation', slug: 'shower-installation', name: 'Shower Installation', description: 'Electric, mixer or digital shower fitting', minPricePence: 6000, maxPricePence: 20000, durationMins: 240 },
          { id: 'dishwasher-installation', slug: 'dishwasher-installation', name: 'Dishwasher Installation', description: 'Plumb in and connect new dishwasher', minPricePence: 3500, maxPricePence: 8000, durationMins: 90 },
          { id: 'washing-machine-installation', slug: 'washing-machine-installation', name: 'Washing Machine Installation', description: 'Connect and level new washing machine', minPricePence: 3000, maxPricePence: 7000, durationMins: 60 },
        ],
      },
      {
        id: 'emergency-plumbing',
        slug: 'emergency-plumbing',
        name: 'Emergency Plumbing',
        description: '24/7 urgent plumbing response',
        icon: 'flame',
        sortOrder: 3,
        services: [
          { id: 'burst-pipe', slug: 'burst-pipe', name: 'Burst Pipe', description: 'Emergency pipe repair and water damage mitigation', minPricePence: 8000, maxPricePence: 25000, durationMins: 180, isPopular: true },
          { id: 'blocked-drain', slug: 'blocked-drain', name: 'Blocked Drain', description: 'High-pressure jetting and drain clearance', minPricePence: 4000, maxPricePence: 12000, durationMins: 90, isPopular: true },
          { id: 'overflow', slug: 'overflow', name: 'Overflow', description: 'Fix overflowing tanks, cisterns or gullies', minPricePence: 3500, maxPricePence: 8000, durationMins: 90 },
          { id: 'water-leak', slug: 'water-leak', name: 'Water Leak', description: 'Trace and repair hidden water leaks', minPricePence: 5000, maxPricePence: 15000, durationMins: 120 },
        ],
      },
    ],
  },
  {
    id: 'electrical',
    slug: 'electrical',
    name: 'Electrical',
    description: 'Certified electrical work, installations and safety checks',
    icon: 'zap',
    color: '#D9A441',
    minPricePence: 4000,
    maxPricePence: 40000,
    sortOrder: 3,
    subcategories: [
      {
        id: 'electrical-repairs',
        slug: 'electrical-repairs',
        name: 'Repairs',
        description: 'Fault finding and electrical repairs',
        icon: 'zap',
        sortOrder: 1,
        services: [
          { id: 'socket-repair', slug: 'socket-repair', name: 'Socket Repair', description: 'Fix loose, cracked or non-working sockets', minPricePence: 4000, maxPricePence: 8000, durationMins: 60 },
          { id: 'light-repair', slug: 'light-repair', name: 'Light Repair', description: 'Fix faulty switches, fittings or circuits', minPricePence: 4000, maxPricePence: 9000, durationMins: 60 },
          { id: 'circuit-fault', slug: 'circuit-fault', name: 'Circuit Fault', description: 'Diagnose and repair tripping circuits', minPricePence: 5000, maxPricePence: 12000, durationMins: 90 },
          { id: 'fuse-box-repair', slug: 'fuse-box-repair', name: 'Fuse Box Repair', description: 'Repair or upgrade consumer units', minPricePence: 8000, maxPricePence: 25000, durationMins: 180 },
        ],
      },
      {
        id: 'electrical-installations',
        slug: 'electrical-installations',
        name: 'Installations',
        description: 'New electrical fittings and smart home devices',
        icon: 'settings',
        sortOrder: 2,
        services: [
          { id: 'light-fitting-installation', slug: 'light-fitting-installation', name: 'Light Fitting Installation', description: 'Fit pendant, spotlights, ceiling lights', minPricePence: 3500, maxPricePence: 10000, durationMins: 90 },
          { id: 'ceiling-fan-installation', slug: 'ceiling-fan-installation', name: 'Ceiling Fan', description: 'Supply and install ceiling fan with light', minPricePence: 6000, maxPricePence: 15000, durationMins: 120 },
          { id: 'smart-doorbell-installation', slug: 'smart-doorbell-installation', name: 'Smart Doorbell', description: 'Wire and configure video doorbell', minPricePence: 4000, maxPricePence: 10000, durationMins: 60 },
          { id: 'cctv-installation', slug: 'cctv-installation', name: 'CCTV Installation', description: 'Multi-camera security system setup', minPricePence: 10000, maxPricePence: 40000, durationMins: 240 },
          { id: 'ev-charger-installation', slug: 'ev-charger-installation', name: 'EV Charger Installation', description: 'Home EV charge point supply and fit', minPricePence: 15000, maxPricePence: 35000, durationMins: 240, isPopular: true },
          { id: 'additional-sockets', slug: 'additional-sockets', name: 'Additional Sockets', description: 'Add new power points or USB sockets', minPricePence: 3500, maxPricePence: 8000, durationMins: 60 },
        ],
      },
      {
        id: 'electrical-testing',
        slug: 'electrical-testing',
        name: 'Testing & Certification',
        description: 'Safety inspections and compliance certificates',
        icon: 'shield',
        sortOrder: 3,
        services: [
          { id: 'electrical-inspection', slug: 'electrical-inspection', name: 'Electrical Inspection (EICR)', description: 'Full electrical condition report for landlords/homeowners', minPricePence: 10000, maxPricePence: 25000, durationMins: 180 },
          { id: 'pat-testing', slug: 'pat-testing', name: 'PAT Testing', description: 'Portable appliance testing for businesses/landlords', minPricePence: 2000, maxPricePence: 5000, durationMins: 60 },
          { id: 'smoke-alarm-installation', slug: 'smoke-alarm-installation', name: 'Smoke Alarm Installation', description: 'Fit and test mains/battery smoke and heat alarms', minPricePence: 3000, maxPricePence: 8000, durationMins: 60 },
        ],
      },
    ],
  },
  {
    id: 'handyman',
    slug: 'handyman',
    name: 'Handyman',
    description: 'Small jobs, repairs and assembly around the home',
    icon: 'hammer',
    color: '#1F3A4D',
    minPricePence: 2500,
    maxPricePence: 20000,
    sortOrder: 4,
    subcategories: [
      {
        id: 'furniture-assembly',
        slug: 'furniture-assembly',
        name: 'Furniture Assembly',
        description: 'Flat-pack and custom furniture building',
        icon: 'tool',
        sortOrder: 1,
        services: [
          { id: 'ikea-furniture-assembly', slug: 'ikea-furniture-assembly', name: 'IKEA Furniture Assembly', description: 'Wardrobes, beds, desks, shelving units', minPricePence: 2500, maxPricePence: 8000, durationMins: 120, isPopular: true },
          { id: 'wardrobe-assembly', slug: 'wardrobe-assembly', name: 'Wardrobe Assembly', description: 'Sliding door, hinged or walk-in wardrobes', minPricePence: 4000, maxPricePence: 12000, durationMins: 180 },
          { id: 'bed-assembly', slug: 'bed-assembly', name: 'Bed Assembly', description: 'Bed frames, divans, ottoman storage beds', minPricePence: 3000, maxPricePence: 8000, durationMins: 90 },
          { id: 'office-furniture-assembly', slug: 'office-furniture-assembly', name: 'Office Furniture', description: 'Desks, chairs, filing cabinets, workstations', minPricePence: 3500, maxPricePence: 10000, durationMins: 120 },
        ],
      },
      {
        id: 'wall-mounting',
        slug: 'wall-mounting',
        name: 'Wall Mounting',
        description: 'Secure mounting for TVs, shelves and decor',
        icon: 'home',
        sortOrder: 2,
        services: [
          { id: 'tv-mounting', slug: 'tv-mounting', name: 'TV Mounting', description: 'Bracket supply and wall mount with cable management', minPricePence: 4000, maxPricePence: 12000, durationMins: 90, isPopular: true },
          { id: 'shelf-installation', slug: 'shelf-installation', name: 'Shelf Installation', description: 'Floating, bracketed or built-in shelving', minPricePence: 2500, maxPricePence: 7000, durationMins: 60 },
          { id: 'mirror-hanging', slug: 'mirror-hanging', name: 'Mirror Hanging', description: 'Heavy mirror and artwork installation', minPricePence: 2000, maxPricePence: 5000, durationMins: 45 },
          { id: 'curtain-pole-installation', slug: 'curtain-pole-installation', name: 'Curtain Pole Installation', description: 'Track, pole or tension wire fitting', minPricePence: 2500, maxPricePence: 6000, durationMins: 60 },
        ],
      },
      {
        id: 'general-handyman',
        slug: 'general-handyman',
        name: 'General Repairs',
        description: 'Odd jobs and minor home repairs',
        icon: 'hammer',
        sortOrder: 3,
        services: [
          { id: 'door-handle-repair', slug: 'door-handle-repair', name: 'Door Handle Repair', description: 'Fix loose, broken or stiff handles', minPricePence: 2500, maxPricePence: 5000, durationMins: 45 },
          { id: 'lock-replacement', slug: 'lock-replacement', name: 'Lock Replacement', description: 'Change cylinder, mortice or digital locks', minPricePence: 3500, maxPricePence: 10000, durationMins: 60 },
          { id: 'minor-repairs', slug: 'minor-repairs', name: 'Minor Repairs', description: 'Loose hinges, squeaky floors, small plaster patches', minPricePence: 2500, maxPricePence: 8000, durationMins: 60 },
          { id: 'picture-hanging', slug: 'picture-hanging', name: 'Picture Hanging', description: 'Art, photos and gallery wall arrangement', minPricePence: 2000, maxPricePence: 5000, durationMins: 60 },
        ],
      },
    ],
  },
  {
    id: 'painting-decorating',
    slug: 'painting',
    name: 'Painting & Decorating',
    description: 'Interior and exterior painting, wallpapering and finishes',
    icon: 'paintbrush',
    color: '#1F3A4D',
    minPricePence: 4000,
    maxPricePence: 50000,
    sortOrder: 5,
    subcategories: [
      {
        id: 'interior-painting',
        slug: 'interior-painting',
        name: 'Interior Painting',
        description: 'Room and whole-house interior decorating',
        icon: 'paintbrush',
        sortOrder: 1,
        services: [
          { id: 'room-painting', slug: 'room-painting', name: 'Room Painting', description: 'Single room walls, ceiling and woodwork', minPricePence: 4000, maxPricePence: 12000, durationMins: 240 },
          { id: 'whole-house-painting', slug: 'whole-house-painting', name: 'Whole House Painting', description: 'Complete interior redecoration', minPricePence: 15000, maxPricePence: 50000, durationMins: 1440 },
          { id: 'wallpaper-installation', slug: 'wallpaper-installation', name: 'Wallpaper Installation', description: 'Hang paste-the-wall or traditional wallpaper', minPricePence: 5000, maxPricePence: 15000, durationMins: 240 },
          { id: 'wallpaper-removal', slug: 'wallpaper-removal', name: 'Wallpaper Removal', description: 'Strip old paper and prep walls for paint', minPricePence: 3000, maxPricePence: 10000, durationMins: 180 },
        ],
      },
      {
        id: 'exterior-painting',
        slug: 'exterior-painting',
        name: 'Exterior Painting',
        description: 'Weatherproof painting for outside surfaces',
        icon: 'brush',
        sortOrder: 2,
        services: [
          { id: 'exterior-house-painting', slug: 'exterior-house-painting', name: 'Exterior House Painting', description: 'Full exterior masonry, render and woodwork', minPricePence: 10000, maxPricePence: 40000, durationMins: 1440 },
          { id: 'fence-painting', slug: 'fence-painting', name: 'Fence Painting', description: 'Stain or paint garden fencing', minPricePence: 3000, maxPricePence: 10000, durationMins: 240 },
          { id: 'deck-painting', slug: 'deck-painting', name: 'Deck Painting', description: 'Oil, stain or paint wooden decking', minPricePence: 3000, maxPricePence: 12000, durationMins: 240 },
          { id: 'garage-painting', slug: 'garage-painting', name: 'Garage Painting', description: 'Interior/exterior garage doors and walls', minPricePence: 2500, maxPricePence: 8000, durationMins: 180 },
        ],
      },
    ],
  },
  {
    id: 'carpentry',
    slug: 'carpentry',
    name: 'Carpentry',
    description: 'Custom woodwork, doors, flooring and fitted furniture',
    icon: 'tool',
    color: '#1F3A4D',
    minPricePence: 5000,
    maxPricePence: 50000,
    sortOrder: 6,
    subcategories: [
      {
        id: 'carpentry-furniture',
        slug: 'carpentry-furniture',
        name: 'Custom Furniture',
        description: 'Bespoke built-in and freestanding pieces',
        icon: 'tool',
        sortOrder: 1,
        services: [
          { id: 'custom-shelves', slug: 'custom-shelves', name: 'Custom Shelves', description: 'Floating, alcove or floor-to-ceiling shelving', minPricePence: 5000, maxPricePence: 20000, durationMins: 240 },
          { id: 'wardrobes', slug: 'wardrobes', name: 'Wardrobes', description: 'Fitted sliding or hinged door wardrobes', minPricePence: 10000, maxPricePence: 40000, durationMins: 480 },
          { id: 'cabinets', slug: 'cabinets', name: 'Cabinets', description: 'Kitchen, bathroom or utility cupboards', minPricePence: 8000, maxPricePence: 30000, durationMins: 360 },
        ],
      },
      {
        id: 'carpentry-doors',
        slug: 'carpentry-doors',
        name: 'Doors',
        description: 'Door hanging, repair and hardware',
        icon: 'home',
        sortOrder: 2,
        services: [
          { id: 'door-hanging', slug: 'door-hanging', name: 'Door Hanging', description: 'Fit new internal or external doors', minPricePence: 4000, maxPricePence: 15000, durationMins: 180 },
          { id: 'door-repair', slug: 'door-repair', name: 'Door Repair', description: 'Plane, adjust hinges, fix sticking doors', minPricePence: 2500, maxPricePence: 8000, durationMins: 90 },
          { id: 'lock-installation', slug: 'lock-installation', name: 'Lock Installation', description: 'Mortice, cylinder or smart lock fitting', minPricePence: 3500, maxPricePence: 10000, durationMins: 90 },
        ],
      },
      {
        id: 'carpentry-flooring',
        slug: 'carpentry-flooring',
        name: 'Flooring',
        description: 'Wood and laminate floor installation',
        icon: 'factory',
        sortOrder: 3,
        services: [
          { id: 'laminate-flooring', slug: 'laminate-flooring', name: 'Laminate Flooring', description: 'Click-lock laminate supply and fit', minPricePence: 15000, maxPricePence: 40000, durationMins: 480 },
          { id: 'hardwood-flooring', slug: 'hardwood-flooring', name: 'Hardwood Flooring', description: 'Solid or engineered wood floor fitting', minPricePence: 25000, maxPricePence: 60000, durationMins: 720 },
          { id: 'skirting-boards', slug: 'skirting-boards', name: 'Skirting Boards', description: 'Supply, fit and finish new skirting', minPricePence: 3000, maxPricePence: 10000, durationMins: 180 },
        ],
      },
    ],
  },
  {
    id: 'gardening-outdoor',
    slug: 'gardening',
    name: 'Gardening & Outdoor',
    description: 'Garden maintenance, landscaping and tree surgery',
    icon: 'tree-pine',
    color: '#6B8F6B',
    minPricePence: 2000,
    maxPricePence: 20000,
    sortOrder: 7,
    subcategories: [
      {
        id: 'garden-maintenance',
        slug: 'garden-maintenance',
        name: 'Garden Maintenance',
        description: 'Regular and one-off garden care',
        icon: 'tree-pine',
        sortOrder: 1,
        services: [
          { id: 'grass-cutting', slug: 'grass-cutting', name: 'Grass Cutting', description: 'Lawn mowing, edging and clippings removal', minPricePence: 2000, maxPricePence: 6000, durationMins: 60, isPopular: true },
          { id: 'hedge-trimming', slug: 'hedge-trimming', name: 'Hedge Trimming', description: 'Shape and reduce hedges of all sizes', minPricePence: 3000, maxPricePence: 10000, durationMins: 120 },
          { id: 'weed-removal', slug: 'weed-removal', name: 'Weed Removal', description: 'Clear weeds from beds, paths and drives', minPricePence: 2500, maxPricePence: 8000, durationMins: 90 },
          { id: 'garden-clearance', slug: 'garden-clearance', name: 'Garden Clearance', description: 'Full garden tidy and green waste removal', minPricePence: 4000, maxPricePence: 15000, durationMins: 240 },
        ],
      },
      {
        id: 'landscaping',
        slug: 'landscaping',
        name: 'Landscaping',
        description: 'Hard landscaping and garden design',
        icon: 'shovel',
        sortOrder: 2,
        services: [
          { id: 'turf-installation', slug: 'turf-installation', name: 'Turf Installation', description: 'New lawn preparation and turf laying', minPricePence: 5000, maxPricePence: 20000, durationMins: 360 },
          { id: 'patio-installation', slug: 'patio-installation', name: 'Patio Installation', description: 'Slab, porcelain or stone patio laying', minPricePence: 15000, maxPricePence: 50000, durationMins: 720 },
          { id: 'decking', slug: 'decking', name: 'Decking', description: 'Timber or composite deck construction', minPricePence: 10000, maxPricePence: 40000, durationMins: 480 },
          { id: 'fencing', slug: 'fencing', name: 'Fencing', description: 'Panel, closeboard or post-and-rail fencing', minPricePence: 8000, maxPricePence: 30000, durationMins: 480 },
        ],
      },
      {
        id: 'trees',
        slug: 'trees',
        name: 'Tree Surgery',
        description: 'Professional tree care and removal',
        icon: 'tree-pine',
        sortOrder: 3,
        services: [
          { id: 'tree-pruning', slug: 'tree-pruning', name: 'Tree Pruning', description: 'Crown reduction, thinning and deadwood removal', minPricePence: 5000, maxPricePence: 20000, durationMins: 240 },
          { id: 'tree-removal', slug: 'tree-removal', name: 'Tree Removal', description: 'Sectional felling or straight drop', minPricePence: 8000, maxPricePence: 30000, durationMins: 360 },
          { id: 'stump-grinding', slug: 'stump-grinding', name: 'Stump Grinding', description: 'Grind out tree stumps below ground level', minPricePence: 3000, maxPricePence: 10000, durationMins: 120 },
        ],
      },
    ],
  },
  {
    id: 'pest-control',
    slug: 'pest-control',
    name: 'Pest Control',
    description: 'Professional pest identification and treatment',
    icon: 'bug',
    color: '#C1622E',
    minPricePence: 5000,
    maxPricePence: 30000,
    sortOrder: 8,
    subcategories: [
      {
        id: 'rats-mice',
        slug: 'rats-mice',
        name: 'Rats & Mice',
        description: 'Rodent control and proofing',
        icon: 'bug',
        sortOrder: 1,
        services: [
          { id: 'rat-treatment', slug: 'rat-treatment', name: 'Rat Treatment', description: 'Baiting, trapping and entry point proofing', minPricePence: 8000, maxPricePence: 25000, durationMins: 120 },
          { id: 'mouse-treatment', slug: 'mouse-treatment', name: 'Mouse Treatment', description: 'Rapid eradication and prevention', minPricePence: 5000, maxPricePence: 15000, durationMins: 90 },
        ],
      },
      {
        id: 'wasps',
        slug: 'wasps',
        name: 'Wasps',
        description: 'Wasp nest removal and treatment',
        icon: 'bug',
        sortOrder: 2,
        services: [
          { id: 'wasp-nest-removal', slug: 'wasp-nest-removal', name: 'Wasp Nest Removal', description: 'Same-day nest treatment and removal', minPricePence: 6000, maxPricePence: 15000, durationMins: 60, isPopular: true },
        ],
      },
      {
        id: 'ants',
        slug: 'ants',
        name: 'Ants',
        description: 'Ant infestation treatment',
        icon: 'bug',
        sortOrder: 3,
        services: [
          { id: 'ant-treatment', slug: 'ant-treatment', name: 'Ant Treatment', description: 'Gel bait and residual spray for nests', minPricePence: 5000, maxPricePence: 12000, durationMins: 90 },
        ],
      },
      {
        id: 'cockroaches',
        slug: 'cockroaches',
        name: 'Cockroaches',
        description: 'Cockroach eradication',
        icon: 'bug',
        sortOrder: 4,
        services: [
          { id: 'cockroach-treatment', slug: 'cockroach-treatment', name: 'Cockroach Treatment', description: 'Multi-visit gel and spray programme', minPricePence: 8000, maxPricePence: 25000, durationMins: 120 },
        ],
      },
      {
        id: 'bed-bugs',
        slug: 'bed-bugs',
        name: 'Bed Bugs',
        description: 'Heat and chemical bed bug treatment',
        icon: 'bug',
        sortOrder: 5,
        services: [
          { id: 'bed-bug-treatment', slug: 'bed-bug-treatment', name: 'Bed Bug Treatment', description: 'Whole-room heat treatment or chemical', minPricePence: 10000, maxPricePence: 30000, durationMins: 360 },
        ],
      },
      {
        id: 'fleas',
        slug: 'fleas',
        name: 'Fleas',
        description: 'Flea fumigation and treatment',
        icon: 'bug',
        sortOrder: 6,
        services: [
          { id: 'flea-treatment', slug: 'flea-treatment', name: 'Flea Treatment', description: 'Spray and fogging for flea infestations', minPricePence: 6000, maxPricePence: 18000, durationMins: 120 },
        ],
      },
      {
        id: 'birds',
        slug: 'birds',
        name: 'Birds',
        description: 'Bird proofing and deterrents',
        icon: 'bug',
        sortOrder: 7,
        services: [
          { id: 'bird-proofing', slug: 'bird-proofing', name: 'Bird Proofing', description: 'Spikes, netting and wire deterrents', minPricePence: 5000, maxPricePence: 20000, durationMins: 180 },
        ],
      },
    ],
  },
  {
    id: 'appliance-services',
    slug: 'appliance-repair',
    name: 'Appliance Services',
    description: 'Repair and installation for household appliances',
    icon: 'settings',
    color: '#C1622E',
    minPricePence: 3500,
    maxPricePence: 25000,
    sortOrder: 9,
    subcategories: [
      {
        id: 'appliance-repair',
        slug: 'appliance-repair',
        name: 'Repair',
        description: 'Fix faults on major white goods',
        icon: 'settings',
        sortOrder: 1,
        services: [
          { id: 'washing-machine-repair', slug: 'washing-machine-repair', name: 'Washing Machine', description: 'Drum, pump, motor, control board faults', minPricePence: 4000, maxPricePence: 15000, durationMins: 90, isPopular: true },
          { id: 'dishwasher-repair', slug: 'dishwasher-repair', name: 'Dishwasher', description: 'Drain, heating, spray arm, electronics', minPricePence: 4000, maxPricePence: 12000, durationMins: 90 },
          { id: 'tumble-dryer-repair', slug: 'tumble-dryer-repair', name: 'Tumble Dryer', description: 'Heating, belt, sensor, condenser issues', minPricePence: 4000, maxPricePence: 12000, durationMins: 90 },
          { id: 'oven-repair', slug: 'oven-repair', name: 'Oven', description: 'Element, thermostat, fan, door seal faults', minPricePence: 4000, maxPricePence: 12000, durationMins: 90 },
          { id: 'fridge-freezer-repair', slug: 'fridge-freezer-repair', name: 'Fridge Freezer', description: 'Cooling, defrost, compressor, seals', minPricePence: 5000, maxPricePence: 20000, durationMins: 120 },
          { id: 'microwave-repair', slug: 'microwave-repair', name: 'Microwave', description: 'Magnetron, turntable, control panel', minPricePence: 3500, maxPricePence: 10000, durationMins: 60 },
        ],
      },
      {
        id: 'appliance-installation',
        slug: 'appliance-installation',
        name: 'Installation',
        description: 'Connect and commission new appliances',
        icon: 'settings',
        sortOrder: 2,
        services: [
          { id: 'washing-machine-install', slug: 'washing-machine-install', name: 'Washing Machine', description: 'Plumb in, level and test new machine', minPricePence: 3000, maxPricePence: 7000, durationMins: 60 },
          { id: 'dishwasher-install', slug: 'dishwasher-install', name: 'Dishwasher', description: 'Connect water, waste and power', minPricePence: 3500, maxPricePence: 8000, durationMins: 90 },
          { id: 'electric-cooker-install', slug: 'electric-cooker-install', name: 'Electric Cooker', description: 'Hardwire and commission cooker/oven', minPricePence: 4000, maxPricePence: 10000, durationMins: 90 },
          { id: 'integrated-appliances', slug: 'integrated-appliances', name: 'Integrated Appliances', description: 'Built-in fridge, freezer, wine cooler fitting', minPricePence: 5000, maxPricePence: 15000, durationMins: 120 },
        ],
      },
    ],
  },
  {
    id: 'heating-gas',
    slug: 'heating-gas',
    name: 'Heating & Gas',
    description: 'Boiler, heating and gas safety services',
    icon: 'flame',
    color: '#D9A441',
    minPricePence: 5000,
    maxPricePence: 40000,
    sortOrder: 10,
    subcategories: [
      {
        id: 'boiler',
        slug: 'boiler',
        name: 'Boiler Services',
        description: 'Repair, install and service gas boilers',
        icon: 'flame',
        sortOrder: 1,
        services: [
          { id: 'boiler-repair', slug: 'boiler-repair', name: 'Boiler Repair', description: 'Fault diagnosis and repair for all brands', minPricePence: 6000, maxPricePence: 20000, durationMins: 120, isPopular: true },
          { id: 'boiler-installation', slug: 'boiler-installation', name: 'Boiler Installation', description: 'New combi, system or heat-only boiler', minPricePence: 15000, maxPricePence: 40000, durationMins: 480 },
          { id: 'boiler-service', slug: 'boiler-service', name: 'Boiler Service', description: 'Annual Gas Safe service and safety check', minPricePence: 5000, maxPricePence: 10000, durationMins: 60, isPopular: true },
        ],
      },
      {
        id: 'heating-services',
        slug: 'heating-services',
        name: 'Central Heating',
        description: 'Radiators, thermostats and system work',
        icon: 'flame',
        sortOrder: 2,
        services: [
          { id: 'radiator-installation', slug: 'radiator-installation', name: 'Radiator Installation', description: 'New or replacement radiator fitting', minPricePence: 4000, maxPricePence: 12000, durationMins: 120 },
          { id: 'radiator-bleeding', slug: 'radiator-bleeding', name: 'Radiator Bleeding', description: 'Remove air from heating system', minPricePence: 2000, maxPricePence: 5000, durationMins: 45 },
          { id: 'thermostat-installation', slug: 'thermostat-installation', name: 'Thermostat Installation', description: 'Smart or programmable thermostat fitting', minPricePence: 4000, maxPricePence: 12000, durationMins: 90 },
        ],
      },
      {
        id: 'gas-services',
        slug: 'gas-services',
        name: 'Gas Safety',
        description: 'Certificates, inspections and gas appliance work',
        icon: 'shield',
        sortOrder: 3,
        services: [
          { id: 'gas-safety-certificate', slug: 'gas-safety-certificate', name: 'Gas Safety Certificate (CP12)', description: 'Landlord annual gas safety check', minPricePence: 5000, maxPricePence: 12000, durationMins: 60 },
          { id: 'gas-leak-inspection', slug: 'gas-leak-inspection', name: 'Gas Leak Inspection', description: 'Emergency leak detection and repair', minPricePence: 6000, maxPricePence: 15000, durationMins: 90 },
          { id: 'cooker-installation', slug: 'cooker-installation', name: 'Gas Cooker Installation', description: 'Connect and commission gas hob/oven', minPricePence: 4000, maxPricePence: 10000, durationMins: 90 },
        ],
      },
    ],
  },
  {
    id: 'air-conditioning',
    slug: 'air-conditioning',
    name: 'Air Conditioning',
    description: 'Installation, repair and servicing for AC systems',
    icon: 'snowflake',
    color: '#1F3A4D',
    minPricePence: 8000,
    maxPricePence: 50000,
    sortOrder: 11,
    subcategories: [
      {
        id: 'ac-installation',
        slug: 'ac-installation',
        name: 'Installation',
        description: 'Split, multi-split and ducted AC systems',
        icon: 'snowflake',
        sortOrder: 1,
        services: [
          { id: 'ac-split-install', slug: 'ac-split-install', name: 'Split System Installation', description: 'Wall-mounted unit with outdoor condenser', minPricePence: 15000, maxPricePence: 35000, durationMins: 480, isPopular: true },
          { id: 'ac-multi-install', slug: 'ac-multi-install', name: 'Multi-Split Installation', description: 'Multiple indoor units from one outdoor', minPricePence: 25000, maxPricePence: 60000, durationMins: 720 },
          { id: 'ac-ducted-install', slug: 'ac-ducted-install', name: 'Ducted Installation', description: 'Concealed central air conditioning', minPricePence: 40000, maxPricePence: 100000, durationMins: 1440 },
        ],
      },
      {
        id: 'ac-repair',
        slug: 'ac-repair',
        name: 'Repair',
        description: 'Fault finding and component replacement',
        icon: 'wrench',
        sortOrder: 2,
        services: [
          { id: 'ac-repair', slug: 'ac-repair', name: 'AC Repair', description: 'Compressor, PCB, sensor, fan motor faults', minPricePence: 8000, maxPricePence: 25000, durationMins: 120 },
        ],
      },
      {
        id: 'ac-servicing',
        slug: 'ac-servicing',
        name: 'Servicing',
        description: 'Annual maintenance and cleaning',
        icon: 'settings',
        sortOrder: 3,
        services: [
          { id: 'ac-service', slug: 'ac-service', name: 'AC Service', description: 'Clean filters, check gas, test performance', minPricePence: 5000, maxPricePence: 12000, durationMins: 90 },
        ],
      },
      {
        id: 'ac-gas-recharge',
        slug: 'ac-gas-recharge',
        name: 'Gas Recharge',
        description: 'Refrigerant top-up and leak test',
        icon: 'droplets',
        sortOrder: 4,
        services: [
          { id: 'ac-gas-recharge', slug: 'ac-gas-recharge', name: 'AC Gas Recharge', description: 'R32/R410A recharge with leak detection', minPricePence: 6000, maxPricePence: 18000, durationMins: 90 },
        ],
      },
    ],
  },
  {
    id: 'roofing',
    slug: 'roofing',
    name: 'Roofing',
    description: 'Roof repairs, replacement and guttering',
    icon: 'house',
    color: '#1F3A4D',
    minPricePence: 5000,
    maxPricePence: 50000,
    sortOrder: 12,
    subcategories: [
      {
        id: 'roof-repair',
        slug: 'roof-repair',
        name: 'Roof Repair',
        description: 'Leaks, slipped tiles, flashing and pointing',
        icon: 'house',
        sortOrder: 1,
        services: [
          { id: 'roof-leak-repair', slug: 'roof-leak-repair', name: 'Roof Leak Repair', description: 'Trace and fix roof leaks', minPricePence: 5000, maxPricePence: 20000, durationMins: 180 },
          { id: 'tile-replacement', slug: 'tile-replacement', name: 'Tile/Slate Replacement', description: 'Replace broken or missing roof tiles', minPricePence: 3000, maxPricePence: 10000, durationMins: 120 },
          { id: 'flashing-repair', slug: 'flashing-repair', name: 'Lead Flashing Repair', description: 'Chimney, valley and abutment flashing', minPricePence: 4000, maxPricePence: 15000, durationMins: 180 },
          { id: 'repointing', slug: 'repointing', name: 'Ridge Repointing', description: 'Re-bed and point ridge tiles', minPricePence: 3000, maxPricePence: 12000, durationMins: 180 },
        ],
      },
      {
        id: 'roof-replacement',
        slug: 'roof-replacement',
        name: 'Roof Replacement',
        description: 'Full or partial roof renewal',
        icon: 'house',
        sortOrder: 2,
        services: [
          { id: 'full-roof-replacement', slug: 'full-roof-replacement', name: 'Full Roof Replacement', description: 'Strip and re-cover complete roof', minPricePence: 40000, maxPricePence: 120000, durationMins: 2880 },
          { id: 'flat-roof', slug: 'flat-roof', name: 'Flat Roof', description: 'EPDM, GRP or felt flat roof systems', minPricePence: 15000, maxPricePence: 50000, durationMins: 720 },
        ],
      },
      {
        id: 'chimney-gutter',
        slug: 'chimney-gutter',
        name: 'Chimney & Guttering',
        description: 'Chimney work and gutter replacement',
        icon: 'house',
        sortOrder: 3,
        services: [
          { id: 'chimney-repair', slug: 'chimney-repair', name: 'Chimney Repair', description: 'Repoint, flaunch, pot and cowl work', minPricePence: 3000, maxPricePence: 15000, durationMins: 240 },
          { id: 'gutter-replacement', slug: 'gutter-replacement', name: 'Gutter Replacement', description: 'uPVC, aluminium or cast iron gutters', minPricePence: 4000, maxPricePence: 20000, durationMins: 240 },
        ],
      },
    ],
  },
  {
    id: 'locksmith',
    slug: 'locksmith',
    name: 'Locksmith',
    description: 'Lockouts, lock changes and security upgrades',
    icon: 'key',
    color: '#1F3A4D',
    minPricePence: 5000,
    maxPricePence: 30000,
    sortOrder: 13,
    subcategories: [
      {
        id: 'lockout-service',
        slug: 'lockout-service',
        name: 'Lockout Service',
        description: 'Emergency non-destructive entry',
        icon: 'key',
        sortOrder: 1,
        services: [
          { id: 'emergency-lockout', slug: 'emergency-lockout', name: 'Emergency Lockout', description: '24/7 door opening without damage', minPricePence: 6000, maxPricePence: 15000, durationMins: 45, isPopular: true },
        ],
      },
      {
        id: 'lock-replacement',
        slug: 'lock-replacement',
        name: 'Lock Replacement',
        description: 'Upgrade or replace door locks',
        icon: 'key',
        sortOrder: 2,
        services: [
          { id: 'cylinder-change', slug: 'cylinder-change', name: 'Euro Cylinder Change', description: 'Anti-snap, 3-star security cylinders', minPricePence: 5000, maxPricePence: 12000, durationMins: 45 },
          { id: 'mortice-lock-change', slug: 'mortice-lock-change', name: 'Mortice Lock Change', description: '5-lever BS3621 insurance-approved locks', minPricePence: 6000, maxPricePence: 15000, durationMins: 60 },
          { id: 'smart-lock-install', slug: 'smart-lock-install', name: 'Smart Lock Installation', description: 'Keyless entry with app control', minPricePence: 8000, maxPricePence: 25000, durationMins: 90 },
        ],
      },
      {
        id: 'door-repair-locksmith',
        slug: 'door-repair-locksmith',
        name: 'Door Repair',
        description: 'Fix alignment, hinges and frames',
        icon: 'home',
        sortOrder: 3,
        services: [
          { id: 'door-alignment', slug: 'door-alignment', name: 'Door Alignment', description: 'Adjust hinges, strikers and closers', minPricePence: 3000, maxPricePence: 8000, durationMins: 60 },
          { id: 'door-frame-repair', slug: 'door-frame-repair', name: 'Door Frame Repair', description: 'Repair split or damaged frames', minPricePence: 4000, maxPricePence: 12000, durationMins: 120 },
        ],
      },
      {
        id: 'security-upgrade',
        slug: 'security-upgrade',
        name: 'Security Upgrade',
        description: 'Enhance home security',
        icon: 'shield',
        sortOrder: 4,
        services: [
          { id: 'security-assessment', slug: 'security-assessment', name: 'Security Assessment', description: 'Home security survey and recommendations', minPricePence: 5000, maxPricePence: 10000, durationMins: 60 },
          { id: 'door-reinforcement', slug: 'door-reinforcement', name: 'Door Reinforcement', description: 'London bars, hinge bolts, viewers', minPricePence: 4000, maxPricePence: 12000, durationMins: 120 },
          { id: 'window-locks', slug: 'window-locks', name: 'Window Locks', description: 'Keyed and push-button window locks', minPricePence: 2500, maxPricePence: 8000, durationMins: 60 },
        ],
      },
    ],
  },
  {
    id: 'moving-services',
    slug: 'moving-services',
    name: 'Moving Services',
    description: 'House moves, packing and man & van services',
    icon: 'truck',
    color: '#6B8F6B',
    minPricePence: 2000,
    maxPricePence: 50000,
    sortOrder: 14,
    subcategories: [
      {
        id: 'house-move',
        slug: 'house-move',
        name: 'House Move',
        description: 'Full home removal service',
        icon: 'truck',
        sortOrder: 1,
        services: [
          { id: 'local-move', slug: 'local-move', name: 'Local Move', description: 'Same city/town house removal', minPricePence: 30000, maxPricePence: 80000, durationMins: 480 },
          { id: 'long-distance-move', slug: 'long-distance-move', name: 'Long Distance Move', description: 'UK-wide relocation service', minPricePence: 50000, maxPricePence: 150000, durationMins: 1440 },
        ],
      },
      {
        id: 'packing-services',
        slug: 'packing-services',
        name: 'Packing',
        description: 'Professional packing and unpacking',
        icon: 'box',
        sortOrder: 2,
        services: [
          { id: 'packing-service', slug: 'packing-service', name: 'Packing Service', description: 'Full or part packing with materials', minPricePence: 15000, maxPricePence: 40000, durationMins: 360 },
          { id: 'unpacking-service', slug: 'unpacking-service', name: 'Unpacking Service', description: 'Unpack and organise at new home', minPricePence: 10000, maxPricePence: 30000, durationMins: 240 },
        ],
      },
      {
        id: 'man-van',
        slug: 'man-van',
        name: 'Man & Van',
        description: 'Small moves and single item transport',
        icon: 'truck',
        sortOrder: 3,
        services: [
          { id: 'single-item', slug: 'single-item', name: 'Single Item', description: 'Sofa, bed, appliance or large item', minPricePence: 2000, maxPricePence: 6000, durationMins: 60 },
          { id: 'student-move', slug: 'student-move', name: 'Student Move', description: 'Budget move for student accommodation', minPricePence: 3000, maxPricePence: 8000, durationMins: 120 },
          { id: 'furniture-transport', slug: 'furniture-transport', name: 'Furniture Transport', description: 'Delivery/collection for purchased items', minPricePence: 2500, maxPricePence: 10000, durationMins: 90 },
        ],
      },
    ],
  },
];

/* ── Helper functions ─────────────────────────────────────────── */

export function getCategoryBySlug(slug: string): Category | undefined {
  return SERVICE_CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryById(id: string): Category | undefined {
  return SERVICE_CATEGORIES.find((c) => c.id === id);
}

export function getSubcategoryBySlug(categorySlug: string, subcategorySlug: string): Subcategory | undefined {
  const category = getCategoryBySlug(categorySlug);
  return category?.subcategories.find((s) => s.slug === subcategorySlug);
}

export function getServiceBySlug(categorySlug: string, subcategorySlug: string, serviceSlug: string): ServiceItem | undefined {
  const subcategory = getSubcategoryBySlug(categorySlug, subcategorySlug);
  return subcategory?.services.find((s) => s.slug === serviceSlug);
}

export function getAllServicesFlat(): (ServiceItem & { categorySlug: string; subcategorySlug: string; categoryName: string; subcategoryName: string })[] {
  const result: (ServiceItem & { categorySlug: string; subcategorySlug: string; categoryName: string; subcategoryName: string })[] = [];
  for (const category of SERVICE_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      for (const service of subcategory.services) {
        result.push({
          ...service,
          categorySlug: category.slug,
          subcategorySlug: subcategory.slug,
          categoryName: category.name,
          subcategoryName: subcategory.name,
        });
      }
    }
  }
  return result;
}

export function getCategoryIcon(iconName: string): LucideIcon {
  return categoryIcons[iconName] || Sparkles;
}

export function getPopularServices(limit = 8): (ServiceItem & { categorySlug: string; categoryName: string })[] {
  // Flat items already carry categorySlug/categoryName (plus subcategory fields, which callers ignore).
  return getAllServicesFlat()
    .filter((s) => s.isPopular)
    .slice(0, limit);
}

export function getCategoriesForHomepage(): Category[] {
  return SERVICE_CATEGORIES.map((cat) => ({
    ...cat,
    minPricePence: cat.minPricePence,
    maxPricePence: cat.maxPricePence,
  }));
}

/* ── Type exports for backward compatibility with homepage-data.ts ── */

export interface HomepageCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  minPricePence: number;
  maxPricePence: number;
  sortOrder: number;
}

export interface HomepageService {
  id: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  icon: string;
  pricePence: number;
  providerName?: string;
  rating?: number;
  reviewCount?: number;
}

export interface HomepageReview {
  id: string;
  authorName: string;
  location: string;
  rating: number;
  comment: string;
}

export interface HomepageData {
  categories: HomepageCategory[];
  reviews: HomepageReview[];
  trending: HomepageService[];
  mostBooked: HomepageService[];
  promoCode: { code: string; discountType: string; discountValue: number } | null;
}