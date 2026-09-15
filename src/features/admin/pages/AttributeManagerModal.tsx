import { useEffect, useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Select } from '@/components/comman/ui/Input';
import {
  apiGetCategoryAttributes,
  apiCreateAttributeDefinition,
  apiUpdateAttributeDefinition,
  apiDeleteAttributeDefinition,
  type AttributeDefinition,
  type AttributeValueType,
} from '@/api/services/attributes';

interface Props {
  categoryId: string;
  categoryName: string;
  onClose: () => void;
}

const TYPE_LABELS: Record<AttributeValueType, string> = {
  text: 'Text',
  select: 'Single choice',
  multiselect: 'Multiple choice',
};

// Admin-managed classification fields for one category (subject, resource
// type, format, etc) — the same fields a seller fills in on the product form
// and a buyer later filters by. See DynamicAttributeFields on the seller side.
export function AttributeManagerModal({ categoryId, categoryName, onClose }: Props) {
  const [definitions, setDefinitions] = useState<AttributeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<AttributeValueType>('select');
  const [optionsInput, setOptionsInput] = useState('');
  const [required, setRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiGetCategoryAttributes(categoryId)
      .then(res => setDefinitions(res.data ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load attributes.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [categoryId]);

  async function createDefinition() {
    setError('');
    if (!key.trim() || !label.trim()) { setError('Key and label are required.'); return; }
    const options = optionsInput.split(',').map(o => o.trim()).filter(Boolean);
    if ((type === 'select' || type === 'multiselect') && options.length === 0) {
      setError('Add at least one option for a choice-type attribute.');
      return;
    }
    setSaving(true);
    try {
      await apiCreateAttributeDefinition(categoryId, {
        key: key.trim().toLowerCase().replace(/\s+/g, '_'),
        label: label.trim(),
        type,
        options,
        required,
        searchable: true,
      });
      setKey(''); setLabel(''); setOptionsInput(''); setRequired(false); setType('select');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create attribute.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleRequired(def: AttributeDefinition) {
    await apiUpdateAttributeDefinition(def._id, { required: !def.required });
    load();
  }

  async function remove(def: AttributeDefinition) {
    if (!confirm(`Remove "${def.label}"? Existing products keep their saved values, but this field will no longer appear.`)) return;
    await apiDeleteAttributeDefinition(def._id);
    load();
  }

  return (
    <Modal mobileSheet title={`Attributes — ${categoryName}`} width={560} onClose={onClose}
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}>
      <div className="flex flex-col gap-4">
        <p className="text-[12px] text-slate leading-[1.5]">
          These fields appear on the seller product form for this category, and become buyer-facing filters
          on the marketplace when a subject/format/etc is chosen this way instead of a free-text tag.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-slate"><Loader2 size={14} className="animate-spin" />Loading…</div>
        ) : definitions.length === 0 ? (
          <p className="text-[12px] text-slate">No attributes defined yet for this category.</p>
        ) : (
          <div className="border border-bone rounded-lg overflow-hidden">
            {definitions.map(def => (
              <div key={def._id} className="flex items-center gap-2 px-3 py-2 border-b border-[#f0eee6] last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-charcoal truncate">{def.label} <span className="text-[11px] text-slate font-normal">({def.key})</span></p>
                  <p className="text-[11px] text-slate">
                    {TYPE_LABELS[def.type]}{def.options.length > 0 ? ` · ${def.options.join(', ')}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => toggleRequired(def)}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${def.required ? 'text-brand-orange border-brand-orange bg-brand-pale-orange' : 'text-slate border-bone bg-white'}`}>
                  {def.required ? 'Required' : 'Optional'}
                </button>
                <button type="button" onClick={() => remove(def)} className="text-slate hover:text-error p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-bone pt-4 flex flex-col gap-3">
          <p className="text-[12px] font-semibold text-charcoal">Add attribute</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Key" placeholder="e.g. subject" value={key} onChange={e => setKey(e.target.value)} />
            <Input label="Label" placeholder="e.g. Subject" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
          <Select label="Type" value={type} onChange={e => setType(e.target.value as AttributeValueType)}>
            <option value="select">Single choice</option>
            <option value="multiselect">Multiple choice</option>
            <option value="text">Free text</option>
          </Select>
          {type !== 'text' && (
            <Input label="Options (comma-separated)" placeholder="e.g. Math, Science, English"
              value={optionsInput} onChange={e => setOptionsInput(e.target.value)} />
          )}
          <label className="flex items-center gap-2 text-[12px] text-charcoal">
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
            Required — sellers must fill this in before publishing
          </label>
          {error && <p className="text-[12px] text-error">{error}</p>}
          <Button onClick={createDefinition} loading={saving}>Add Attribute</Button>
        </div>
      </div>
    </Modal>
  );
}
