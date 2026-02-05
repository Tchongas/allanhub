export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  image: string;
  color: string;
  url: string;
  shop_link?: string;
  price: number;
  duration_months: number;
  is_lifetime: boolean;
  features: string[];
  active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserProduct {
  id: string;
  user_id: string;
  product_id: string;
  status: 'active' | 'expired' | 'cancelled';
  activated_at: Date;
  expires_at: Date;
  activation_code: string;
}

export interface ActivationCode {
  code: string;
  product_id: string;
  used: boolean;
  used_by?: string;
  used_at?: Date;
  created_at: Date;
  expires_at?: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
