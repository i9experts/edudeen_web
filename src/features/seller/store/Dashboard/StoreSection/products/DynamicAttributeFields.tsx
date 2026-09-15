import type { AttributeDefinition } from '@/api/services/attributes';
import type { AttributeValuesState } from './attributeFormUtils';

const inp = 'w-full px-3 py-2 text-[13px] border border-bone rounded-lg text-charcoal bg-white placeholder:text-[#b5b3ac] outline-none';
const selCls = 'w-full px-3 py-2 text-[13px] border border-bone rounded-lg text-charcoal bg-white outline-none cursor-pointer';

interface Props {
  definitions: AttributeDefinition[];
  loading: boolean;
  value: AttributeValuesState;
  onChange: (next: AttributeValuesState) => void;
}

/** Renders one field per category attribute definition (text/select/multiselect),
 *  keyed by attributeDefinitionId — the same fields both classify a product
 *  (seller side) and drive buyer-facing filters (see useCategoryAttributes /
 *  the `attributes` query param on the marketplace listing endpoint). Fetching
 *  is the caller's job (via useCategoryAttributes) so the same definitions
 *  list can also be used for pre-submit required-field validation. */
export function DynamicAttributeFields({ definitions, loading, value, onChange }: Props) {
  if (!loading && definitions.length === 0) return null;

  function setValue(def: AttributeDefinition, next: string[]) {
    onChange({ ...value, [def._id]: next });
  }

  return (
    <div className="flex flex-col gap-4">
      {loading && <p className="text-[12px] text-slate">Loading category fields…</p>}
      {definitions.map(def => {
        const current = value[def._id] ?? [];
        return (
          <div key={def._id}>
            <label className="text-[12px] font-semibold text-graphite block mb-1.5">
              {def.label}{def.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {def.type === 'text' && (
              <input
                className={inp}
                value={current[0] ?? ''}
                onChange={e => setValue(def, e.target.value ? [e.target.value] : [])}
                placeholder={def.label}
              />
            )}

            {def.type === 'select' && (
              <select
                className={selCls}
                value={current[0] ?? ''}
                onChange={e => setValue(def, e.target.value ? [e.target.value] : [])}
              >
                <option value="">Select {def.label.toLowerCase()}</option>
                {def.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}

            {def.type === 'multiselect' && (
              <div className="flex flex-wrap gap-2">
                {def.options.map(o => {
                  const checked = current.includes(o);
                  return (
                    <button
                      type="button"
                      key={o}
                      onClick={() => setValue(def, checked ? current.filter(v => v !== o) : [...current, o])}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors"
                      style={checked
                        ? { background: '#FBECE4', borderColor: '#D97757', color: '#D97757' }
                        : { background: '#fff', borderColor: '#E8E6DC', color: '#141413' }}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
