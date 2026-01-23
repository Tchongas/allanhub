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
    name: 'Produto 2',
    description: 'Descrição do segundo produto. Em desenvolvimento.',
    iconName: 'rocket',
    image: '/images/produto-2.jpg',
    color: 'emerald',
    url: process.env.PRODUCT_2_URL || 'http://localhost:3002',
    price: 39.90,
    duration_months: 3,
    features: [
      'Feature 1',
      'Feature 2',
      'Feature 3',
    ],
    active: false,
  },
  {
    id: 'produto-3',
    name: 'Produto 3',
    description: 'Descrição do terceiro produto. Em desenvolvimento.',
    iconName: 'sparkles',
    image: '/images/produto-3.jpg',
    color: 'violet',
    url: process.env.PRODUCT_3_URL || 'http://localhost:3003',
    price: 29.90,
    duration_months: 3,
    features: [
      'Feature A',
      'Feature B',
      'Feature C',
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
