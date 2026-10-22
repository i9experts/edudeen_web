import { useEffect, useState } from 'react';
import { inp } from './ProductFormKit';
import { weightFromStored, type WeightUnit } from './priceRules';

const compose = (num: string, unit: WeightUnit) => (num.trim() === '' ? '' : `${num.trim()} ${unit}`);

/**
 * Shipping weight as a number box + kg / g select. The form keeps ONE text value ("500 g"); a value that arrives from
 * outside (an old product's "0.4 kg" / "500g") is split back into number + unit, grams for anything under 1 kg.
 */
export function WeightField({ id, value, onChange }: { id: string; value: string; onChange: (text: string) => void }) {
  const [num, setNum] = useState(() => weightFromStored(value).value);
  const [unit, setUnit] = useState<WeightUnit>(() => weightFromStored(value).unit);
  useEffect(() => {
    if (value === compose(num, unit)) return;
    const w = weightFromStored(value);
    setNum(w.value); setUnit(w.unit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="flex gap-2 sm:max-w-[240px]">
      <input id={id} type="number" min={0} step="any" inputMode="decimal" value={num} placeholder={unit === 'kg' ? 'e.g. 0.5' : 'e.g. 500'}
        onChange={e => { setNum(e.target.value); onChange(compose(e.target.value, unit)); }} className={inp} />
      <select aria-label="Weight unit" value={unit} className={`${inp} !w-[80px] shrink-0 cursor-pointer`}
        onChange={e => { const u = e.target.value as WeightUnit; setUnit(u); onChange(compose(num, u)); }}>
        <option value="kg">kg</option><option value="g">g</option>
      </select>
    </div>
  );
}
