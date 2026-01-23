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
  iconName: string;
  image: string;
  color: string;
  url: string;
  price: number;
  duration_months: number;
  features: string[];
  active: boolean;
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
