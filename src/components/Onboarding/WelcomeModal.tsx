import { useRef } from 'react';
import { Plane, ShoppingCart, Globe } from 'lucide-react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Modal } from '../Shared/Modal';

const FEATURES = [
  {
    icon: Plane,
    title: 'Plan Trips',
    description: 'Create trips with budgets and destinations',
  },
  {
    icon: ShoppingCart,
    title: 'Track Items',
    description: 'Build shopping lists for each trip',
  },
  {
    icon: Globe,
    title: 'Multi-Currency',
    description: 'Automatic currency conversion',
  },
];

export function WelcomeModal() {
  const { showWelcomeModal, closeWelcomeModal } = useOnboarding();
  const getStartedRef = useRef<HTMLButtonElement>(null);

  if (!showWelcomeModal) return null;

  return (
    <Modal
      title="Welcome to ShopSmart Travel"
      onClose={closeWelcomeModal}
      initialFocusRef={getStartedRef}
      bodyClassName="p-0"
      footer={
        <button
          ref={getStartedRef}
          type="button"
          onClick={closeWelcomeModal}
          className="w-full min-h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          Get Started
        </button>
      }
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShoppingCart className="w-8 h-8" aria-hidden="true" />
        </div>
        <p className="text-blue-100">Plan your shopping across trips</p>
      </div>

      <ul className="p-6 space-y-4">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <feature.icon className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
