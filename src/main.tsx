import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { CurrencyPreferenceProvider } from '@/contexts/CurrencyPreferenceContext';
import { AuthGateProvider } from '@/contexts/AuthGateContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthGateProvider>
        <LanguageProvider>
        <CurrencyPreferenceProvider>
          <CartProvider>
            <WishlistProvider>
              <NotificationProvider>
                <RouterProvider router={router} />
              </NotificationProvider>
            </WishlistProvider>
          </CartProvider>
        </CurrencyPreferenceProvider>
        </LanguageProvider>
      </AuthGateProvider>
    </ToastProvider>
  </StrictMode>,
);
