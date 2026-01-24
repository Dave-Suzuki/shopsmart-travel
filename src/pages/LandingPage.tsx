import { Link } from 'react-router-dom';
import { ShoppingBag, Chrome, Globe, CreditCard, Users, ArrowRight, CheckCircle, Plane } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>

        <nav className="relative z-10 container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <ShoppingBag className="w-8 h-8" />
              <span className="text-xl font-bold">ShopSmart Travel</span>
            </div>
            <Link
              to="/app"
              className="bg-white text-blue-600 px-5 py-2 rounded-full font-semibold hover:bg-blue-50 transition-colors"
            >
              Open App
            </Link>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm mb-6">
              <Plane className="w-4 h-4" />
              <span>Your smart shopping companion for travel</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Plan Your Shopping.<br />
              <span className="text-blue-200">Across Any Destination.</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl">
              Create shopping lists for your trips, add products from any website with our Chrome extension, and track your budget across currencies.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/app"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all hover:scale-105 shadow-lg"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#extension"
                className="inline-flex items-center justify-center gap-2 bg-blue-500/30 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-500/40 transition-colors border border-white/20"
              >
                <Chrome className="w-5 h-5" />
                Get Chrome Extension
              </a>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Travel Shopping
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From planning to purchasing, ShopSmart keeps your shopping organized across all your adventures.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Globe className="w-8 h-8" />}
              title="Trip-Based Lists"
              description="Organize your shopping by destination. Paris, Tokyo, New York - each trip gets its own list."
            />
            <FeatureCard
              icon={<Chrome className="w-8 h-8" />}
              title="Chrome Extension"
              description="Add products from any website with one click. Works on Amazon, boutique stores, anywhere."
            />
            <FeatureCard
              icon={<CreditCard className="w-8 h-8" />}
              title="Multi-Currency"
              description="Track prices in local currencies. See your total budget in your home currency."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Share Lists"
              description="Traveling with friends? Share your shopping list and plan together."
            />
          </div>
        </div>
      </section>

      {/* Chrome Extension Section */}
      <section id="extension" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Chrome className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold">Chrome Extension</h3>
                </div>

                <p className="text-xl text-blue-100 mb-8 max-w-xl">
                  Add products to your shopping list from any website. Just click the extension while browsing and save items instantly.
                </p>

                <div className="space-y-3 mb-8">
                  <ExtensionFeature text="Works on any e-commerce site" />
                  <ExtensionFeature text="Automatically extracts product details" />
                  <ExtensionFeature text="Import entire shopping carts" />
                  <ExtensionFeature text="Syncs with your trips instantly" />
                </div>

                <a
                  href="/shopsmart-v107.zip"
                  download
                  className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                >
                  <Chrome className="w-5 h-5" />
                  Download Extension
                </a>
                <p className="text-blue-200 text-sm mt-3">
                  * Requires Chrome Developer Mode. Instructions included.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to organized travel shopping
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number="1"
              title="Create a Trip"
              description="Add your destination and set your budget in any currency."
            />
            <StepCard
              number="2"
              title="Add Products"
              description="Use our Chrome extension to save products from any website."
            />
            <StepCard
              number="3"
              title="Shop Smart"
              description="Check off items as you buy. Stay on budget, stay organized."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Shop Smarter?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-xl mx-auto">
            Join travelers who plan their shopping with ShopSmart. It's free to get started.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all hover:scale-105 shadow-lg"
          >
            Start Planning Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white">
              <ShoppingBag className="w-6 h-6" />
              <span className="font-semibold">ShopSmart Travel</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} ShopSmart Travel. Made for smart shoppers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow">
      <div className="bg-blue-100 text-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function ExtensionFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle className="w-5 h-5 text-blue-200" />
      <span>{text}</span>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
