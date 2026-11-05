import { PRIORITY_LEVELS, type PriorityLevel } from '../../constants/priorities';

interface PriorityPickerProps {
  value: PriorityLevel | undefined;
  onChange: (priority: PriorityLevel) => void;
}

/** Five toggle buttons, one per priority; fits a 343px-wide phone form. */
export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="block text-sm font-medium text-gray-700 mb-2">Priority</legend>
      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {PRIORITY_LEVELS.map((p) => (
          <button
            key={p.level}
            type="button"
            onClick={() => onChange(p.level)}
            aria-pressed={value === p.level}
            className={`flex min-h-11 flex-col items-center justify-center rounded-lg border-2 px-1 py-2 transition-colors duration-200 ${
              value === p.level
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-2xl mb-1" aria-hidden="true">{p.icon}</span>
            <span className="text-xs leading-tight text-center text-gray-600">{p.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
