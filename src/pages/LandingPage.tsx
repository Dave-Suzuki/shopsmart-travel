import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Chrome, Globe, CreditCard, Users, ArrowRight, CheckCircle, Plane, ChevronDown, ShoppingCart, MapPin, DollarSign } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>

        <nav className="relative z-10 container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className="text-lg sm:text-xl font-bold">ShopSmart Travel</span>
            </div>
            <Link
              to="/app"
              className="bg-white text-blue-600 px-4 sm:px-5 py-2 rounded-full font-semibold hover:bg-blue-50 transition-colors text-sm sm:text-base"
            >
              Open App
            </Link>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm mb-4 sm:mb-6">
              <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Your smart shopping companion for travel</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Plan Your Shopping.<br />
              <span className="text-blue-200">Across Any Destination.</span>
            </h1>
            <p className="text-base sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-2xl">
              Create shopping lists for your trips, add products from any website with our Chrome extension, and track your budget across currencies.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                to="/app"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-blue-50 transition-all hover:scale-105 shadow-lg"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <a
                href="#extension"
                className="inline-flex items-center justify-center gap-2 bg-blue-500/30 backdrop-blur-sm text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-blue-500/40 transition-colors border border-white/20"
              >
                <Chrome className="w-4 h-4 sm:w-5 sm:h-5" />
                Get Chrome Extension
              </a>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </header>

      {/* App Preview Section */}
      <section className="py-12 sm:py-20 bg-white overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              See It In Action
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
              A clean, intuitive interface that makes travel shopping a breeze
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Desktop Mockup */}
            <div className="hidden md:block">
              <DesktopMockup />
            </div>

            {/* Mobile Mockup - shown on mobile, positioned on desktop */}
            <div className="md:absolute md:-right-4 lg:right-8 md:bottom-0 md:transform md:translate-y-1/4">
              <MobileMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Everything You Need for Travel Shopping
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
              From planning to purchasing, ShopSmart keeps your shopping organized across all your adventures.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <FeatureCard
              icon={<Globe className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Trip-Based Lists"
              description="Organize your shopping by destination. Paris, Tokyo, New York - each trip gets its own list."
            />
            <FeatureCard
              icon={<Chrome className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Chrome Extension"
              description="Add products from any website with one click. Works on Amazon, boutique stores, anywhere."
            />
            <FeatureCard
              icon={<CreditCard className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Multi-Currency"
              description="Track prices in local currencies. See your total budget in your home currency."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 sm:w-8 sm:h-8" />}
              title="Share Lists"
              description="Traveling with friends? Share your shopping list and plan together."
            />
          </div>
        </div>
      </section>

      {/* Chrome Extension Section */}
      <section id="extension" className="py-12 sm:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-32 sm:w-48 h-32 sm:h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl">
                    <Chrome className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold">Chrome Extension</h3>
                </div>

                <p className="text-base sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-xl">
                  Add products to your shopping list from any website. Just click the extension while browsing and save items instantly.
                </p>

                <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  <ExtensionFeature text="Works on any e-commerce site" />
                  <ExtensionFeature text="Automatically extracts product details" />
                  <ExtensionFeature text="Import entire shopping carts" />
                  <ExtensionFeature text="Syncs with your trips instantly" />
                </div>

                <a
                  href="/shopsmart-v108.zip"
                  download
                  className="inline-flex items-center gap-2 bg-white text-blue-600 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors text-sm sm:text-base"
                >
                  <Chrome className="w-4 h-4 sm:w-5 sm:h-5" />
                  Download Extension
                </a>
                <p className="text-blue-200 text-xs sm:text-sm mt-2 sm:mt-3">
                  * Requires Chrome Developer Mode. Instructions included.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              How It Works
            </h2>
            <p className="text-base sm:text-xl text-gray-600">
              Three simple steps to organized travel shopping
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
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

      {/* FAQ Section */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-base sm:text-xl text-gray-600">
                Got questions? We've got answers.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <FAQItem
                question="Is ShopSmart Travel free to use?"
                answer="Yes! ShopSmart Travel is completely free. Create unlimited trips, add unlimited items, and share with as many people as you want."
              />
              <FAQItem
                question="How does the Chrome extension work?"
                answer="Once installed, just click the ShopSmart icon while viewing any product page. The extension automatically extracts the product name, price, and image, then lets you add it to any of your trips."
              />
              <FAQItem
                question="Can I use it on my phone?"
                answer="Absolutely! ShopSmart Travel is a Progressive Web App (PWA) that works great on mobile browsers. You can even add it to your home screen for quick access."
              />
              <FAQItem
                question="How does multi-currency work?"
                answer="Set your trip's budget in any currency. When you add items in different currencies, we automatically convert them using real-time exchange rates so you always know your true spending."
              />
              <FAQItem
                question="Can I share my list with others?"
                answer="Yes! You can invite other users by email to collaborate on any trip. They'll be able to view and edit the shopping list alongside you."
              />
              <FAQItem
                question="Is my data secure?"
                answer="We use Google Sign-In for authentication and store all data securely in Firebase. Your shopping lists are private and only visible to you and people you explicitly share with."
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
            Ready to Shop Smarter?
          </h2>
          <p className="text-base sm:text-xl text-blue-100 mb-6 sm:mb-8 max-w-xl mx-auto">
            Join travelers who plan their shopping with ShopSmart. It's free to get started.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-blue-50 transition-all hover:scale-105 shadow-lg"
          >
            Start Planning Now
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="font-semibold">ShopSmart Travel</span>
            </div>
            <p className="text-xs sm:text-sm text-center sm:text-right">
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
    <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-shadow border border-gray-100">
      <div className="bg-blue-100 text-blue-600 w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-gray-600">{description}</p>
    </div>
  );
}

function ExtensionFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200 flex-shrink-0" />
      <span className="text-sm sm:text-base">{text}</span>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="bg-blue-600 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold mx-auto mb-3 sm:mb-4">
        {number}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-gray-600">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm sm:text-base pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96' : 'max-h-0'}`}
      >
        <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-gray-600 text-sm sm:text-base">
          {answer}
        </p>
      </div>
    </div>
  );
}

function DesktopMockup() {
  return (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-3 shadow-2xl ring-1 ring-white/10">
      {/* Browser chrome */}
      <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-xl px-4 py-3 flex items-center gap-3">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
        </div>
        <div className="flex-1 flex items-center gap-2 bg-gray-900/50 rounded-lg px-4 py-1.5 ml-2">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-400 text-sm">shopsmart-800cb.web.app</span>
        </div>
      </div>

      {/* App content mockup */}
      <div className="bg-gray-50 rounded-b-xl overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">ShopSmart Travel</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
              DS
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Trip Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-xl mb-1">Paris Summer Trip</h3>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>Paris, France</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span>Jun 15 - Jun 22</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">1 of 4 bought</span>
              </div>
            </div>
            {/* Budget bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Budget: €500</span>
                <span className="font-semibold text-gray-900">€408 planned</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
          </div>

          {/* Shopping List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Shopping List</h4>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25">
                <span>+</span> Add Item
              </button>
            </div>

            <div className="space-y-3">
              <DesktopItemMockup
                emoji="👜"
                name="Louis Vuitton Neverfull"
                brand="Louis Vuitton"
                price="€1,200"
                location="Galeries Lafayette"
                checked={true}
                priority="high"
              />
              <DesktopItemMockup
                emoji="🧴"
                name="Chanel No. 5 Perfume"
                brand="Chanel"
                price="€135"
                location="Duty Free"
                checked={false}
                priority="high"
              />
              <DesktopItemMockup
                emoji="🍫"
                name="French Chocolate Collection"
                brand="La Maison du Chocolat"
                price="€48"
                location="Le Marais"
                checked={false}
                priority="medium"
              />
              <DesktopItemMockup
                emoji="🧣"
                name="Cashmere Scarf"
                brand="Hermès"
                price="€425"
                location="Champs-Élysées"
                checked={false}
                priority="low"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopItemMockup({
  emoji,
  name,
  brand,
  price,
  location,
  checked,
  priority
}: {
  emoji: string;
  name: string;
  brand: string;
  price: string;
  location: string;
  checked: boolean;
  priority: 'high' | 'medium' | 'low';
}) {
  const priorityColors = {
    high: 'bg-red-100 text-red-600',
    medium: 'bg-yellow-100 text-yellow-600',
    low: 'bg-gray-100 text-gray-600',
  };
  const priorityLabels = {
    high: '🔥',
    medium: '⭐',
    low: '💭',
  };

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${checked ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'}`}>
      <button className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}>
        {checked && <CheckCircle className="w-4 h-4 text-white" />}
      </button>

      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
        {emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-medium ${checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>{name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${priorityColors[priority]}`}>{priorityLabels[priority]}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{brand}</span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {location}
          </span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className={`font-bold text-lg ${checked ? 'text-gray-400' : 'text-gray-900'}`}>{price}</div>
      </div>
    </div>
  );
}

function MobileMockup() {
  return (
    <div className="mx-auto" style={{ width: '220px' }}>
      {/* Phone frame - iPhone 15 Pro proportions (roughly 1:2.16 aspect ratio) */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-2 shadow-2xl ring-1 ring-white/10 relative">
        {/* Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-20"></div>

        {/* Screen - using aspect ratio for iPhone 15 Pro */}
        <div className="bg-white rounded-[2rem] overflow-hidden relative" style={{ aspectRatio: '393/852' }}>
          {/* Status bar */}
          <div className="px-6 pt-2 pb-1 flex items-center justify-between text-[10px] font-semibold">
            <span className="text-gray-900">9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.01 21.49L23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7l11.63 14.49.01.01.01-.01z"/>
              </svg>
              <svg className="w-4 h-2.5 text-gray-900" viewBox="0 0 25 12">
                <rect x="0" y="0" width="21" height="12" rx="2.5" stroke="currentColor" strokeWidth="1" fill="none"/>
                <rect x="2" y="2" width="17" height="8" rx="1" fill="currentColor"/>
                <rect x="22" y="3.5" width="2.5" height="5" rx="1" fill="currentColor"/>
              </svg>
            </div>
          </div>

          {/* App Header */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-base">Paris Trip</h2>
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-semibold">DS</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-blue-100 text-[10px] mb-2">
              <MapPin className="w-3 h-3" />
              <span>Paris, France</span>
              <span className="mx-0.5">•</span>
              <span>Jun 15-22</span>
            </div>
            {/* Progress */}
            <div className="bg-white/20 rounded-full h-1 mb-1">
              <div className="bg-white rounded-full h-1" style={{ width: '25%' }}></div>
            </div>
            <div className="flex justify-between text-[9px] text-blue-100">
              <span>1 of 4 items</span>
              <span>€408 / €500</span>
            </div>
          </div>

          {/* Shopping list */}
          <div className="px-3 py-3 bg-gray-50 flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Shopping List</span>
            </div>

            <div className="space-y-2">
              <MobileItemMockup
                emoji="👜"
                name="LV Neverfull"
                price="€1,200"
                checked={true}
              />
              <MobileItemMockup
                emoji="🧴"
                name="Chanel No. 5"
                price="€135"
                checked={false}
              />
              <MobileItemMockup
                emoji="🍫"
                name="Chocolate Box"
                price="€48"
                checked={false}
              />
              <MobileItemMockup
                emoji="🧣"
                name="Hermès Scarf"
                price="€425"
                checked={false}
              />
            </div>

            {/* Add button */}
            <button className="w-full mt-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/25">
              <span className="text-sm">+</span> Add Item
            </button>
          </div>

          {/* Bottom nav */}
          <div className="bg-white border-t border-gray-100 px-4 py-2 flex items-center justify-around">
            <div className="flex flex-col items-center gap-0.5">
              <Plane className="w-4 h-4 text-gray-400" />
              <span className="text-[8px] text-gray-400">Trips</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span className="text-[8px] text-blue-600 font-medium">List</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-[8px] text-gray-400">Budget</span>
            </div>
          </div>

          {/* Home indicator */}
          <div className="pb-2 pt-1 flex justify-center">
            <div className="w-24 h-1 bg-gray-900 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Reflection/shadow effect */}
      <div className="mt-3 h-3 bg-gradient-to-b from-gray-300/40 to-transparent rounded-full mx-6 blur-sm"></div>
    </div>
  );
}

function MobileItemMockup({ emoji, name, price, checked }: { emoji: string; name: string; price: string; checked: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg bg-white shadow-sm ${checked ? 'opacity-50' : ''}`}>
      <button className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
        {checked && <CheckCircle className="w-3 h-3 text-white" />}
      </button>
      <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center text-sm flex-shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-[11px] font-medium block truncate ${checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>{name}</span>
      </div>
      <span className={`text-[11px] font-bold flex-shrink-0 ${checked ? 'text-gray-400' : 'text-gray-900'}`}>{price}</span>
    </div>
  );
}
