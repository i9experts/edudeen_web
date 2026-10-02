import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  options:      FilterOption[];
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  className?:   string;
}

export function FilterDropdown({ options, value, onChange, placeholder, className }: FilterDropdownProps) {
  return (
    <div className={clsx('relative inline-flex items-center', className)}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-white border border-bone rounded-lg text-[13px] text-carbon ps-3 pe-7 py-[7px] outline-none cursor-pointer hover:bg-cream transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute end-2 pointer-events-none text-slate" />
    </div>
  );
}
