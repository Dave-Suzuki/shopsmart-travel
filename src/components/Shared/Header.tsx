import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { UserProfile } from '../Auth/UserProfile';

export function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
      <div className="container mx-auto px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/app"
            className="-ml-1 flex min-h-11 items-center gap-2 rounded-lg px-1 text-white sm:gap-3"
          >
            <ShoppingBag className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
            <span className="text-xl font-bold sm:text-2xl">ShopSmart Travel</span>
          </Link>
          <UserProfile />
        </div>
      </div>
    </header>
  );
}
