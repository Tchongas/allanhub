import { createServiceRoleClient } from './server';
import { User, UserProduct, ActivationCode, Product } from '@/types';

export async function getUserById(userId: string): Promise<User | null> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('hub_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('hub_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function createUser(email: string, name: string): Promise<User> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('hub_users')
    .insert({ email, name })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data as User;
}

export async function getUserProducts(userId: string): Promise<UserProduct[]> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('user_products')
    .select('*')
    .eq('user_id', userId)
    .order('activated_at', { ascending: false });

  if (error) return [];
  return data as UserProduct[];
}

export async function getActiveUserProduct(userId: string, productId: string): Promise<UserProduct | null> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('user_products')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;
  return data as UserProduct;
}

export async function validateActivationCode(code: string): Promise<ActivationCode | null> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('activation_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data) return null;
  
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }
  
  return data as ActivationCode;
}

export async function activateProduct(
  userId: string,
  code: string,
  productId: string,
  durationMonths: number = 3,
  isLifetime: boolean = false
): Promise<UserProduct> {
  const supabase = createServiceRoleClient();
  
  const activatedAt = new Date();
  let expiresAt: Date;
  
  if (isLifetime) {
    // Set expiration to 100 years from now for lifetime purchases
    expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);
  } else {
    expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
  }

  const { data: userProduct, error: productError } = await supabase
    .from('user_products')
    .insert({
      user_id: userId,
      product_id: productId,
      status: 'active',
      activated_at: activatedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      activation_code: code,
      is_lifetime: isLifetime,
    })
    .select()
    .single();

  if (productError) throw new Error(`Failed to activate product: ${productError.message}`);

  return userProduct as UserProduct;
}

export async function generateActivationCode(productId: string): Promise<string> {
  const supabase = createServiceRoleClient();
  
  const prefix = productId.substring(0, 2).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);
  const code = `${prefix}-${timestamp}-${random}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

  await supabase
    .from('activation_codes')
    .insert({
      code,
      product_id: productId,
      used: false,
    });

  return code;
}

export async function getActivationCodesForProduct(productId: string, limit: number = 5): Promise<ActivationCode[]> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('activation_codes')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as ActivationCode[];
}

export async function generateMultipleActivationCodes(productId: string, count: number = 5): Promise<string[]> {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = await generateActivationCode(productId);
    codes.push(code);
  }
  
  return codes;
}

export async function getProductByActivationCode(code: string | null | undefined): Promise<Product | null> {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return null;

  const supabase = createServiceRoleClient();
  const { data: activationCode, error: codeError } = await supabase
    .from('activation_codes')
    .select('product_id')
    .eq('code', normalizedCode)
    .single();

  if (codeError || !activationCode) return null;

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', activationCode.product_id)
    .single();

  if (productError || !product) return null;
  return product as Product;
}
