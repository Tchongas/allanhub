import { Product } from '@/types';

export const PRODUCTS: Product[] = [
  {
    id: 'festa-magica',
    name: 'Festa Mágica',
    description: 'Crie convites e kits de festa infantil personalizados com inteligência artificial. Transforme fotos em artes únicas para aniversários.',
    iconName: 'party-popper',
    image: '/images/festa-magica.jpg',
    color: 'blue',
    url: process.env.FESTA_MAGICA_URL || 'https://festa-magica-two.vercel.app',
    price: 49.90,
    duration_months: 3,
    features: [
      'Geração ilimitada de kits',
      'Download em alta qualidade',
      'Estilos 2D e 3D',
      'Suporte por email',
    ],
    active: true,
  },
  {
    id: 'produto-2',
    name: 'Em breve',
    description: 'Mais produtos disponíveis em breve...',
    iconName: 'rocket',
    image: '/images/produto-2.jpg',
    color: 'emerald',
    url: process.env.PRODUCT_2_URL || 'http://localhost:3002',
    price: 0.00,
    duration_months: 3,
    features: [
    ],
    active: false,
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find(p => p.id === id);
}

export function getActiveProducts(): Product[] {
  return PRODUCTS.filter(p => p.active);
}
