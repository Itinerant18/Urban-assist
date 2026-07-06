export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  min_price_pence: number;
  max_price_pence: number;
  sort_order: number;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  price_pence: number;
  duration_mins: number;
  is_active: boolean;
}
