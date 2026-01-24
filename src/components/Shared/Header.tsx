import { ShoppingBag } from 'lucide-react';
import { UserProfile } from '../Auth/UserProfile';

export function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">ShopSmart Travel</h1>
              <p className="text-blue-100 text-sm">Paris & London Shopping</p>
            </div>
          </div>
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
