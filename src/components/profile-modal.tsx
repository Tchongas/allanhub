"use client";

import { useState } from 'react';
import { X, User, Mail, Calendar, Package, LogOut } from 'lucide-react';
import { Button } from '@/components/ui';
import { User as UserType, UserProduct } from '@/types';
import { getDaysRemaining } from '@/lib/utils';

interface ProfileModalProps {
  user: UserType;
  products: UserProduct[];
  onClose: () => void;
  onLogout: () => void;
}

export function ProfileModal({ user, products, onClose, onLogout }: ProfileModalProps) {
  const activeProducts = products.filter(
    p => p.status === 'active' && new Date(p.expires_at) > new Date()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Meu Perfil</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">{user.name}</h3>
              <p className="text-slate-400 text-sm flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produtos Ativos ({activeProducts.length})
              </h4>
              {activeProducts.length > 0 ? (
                <div className="space-y-2">
                  {activeProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between"
                    >
                      <span className="text-white text-sm font-medium">
                        {product.product_id}
                      </span>
                      <span className="text-xs text-slate-400">
                        {getDaysRemaining(product.expires_at)} dias restantes
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">
                  Nenhum produto ativo. Ative um código para começar!
                </p>
              )}
            </div>

            {user.created_at && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Membro desde {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-700">
          <Button
            variant="ghost"
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
}
