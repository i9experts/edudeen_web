import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus, LayoutTemplate, GripVertical } from 'lucide-react';
import { ActionMenu } from '@/components/comman/ui';
import type { Section, Block } from '@/api/services/storefrontTypes';
import { SECTION_META_BY_TYPE } from './sectionRegistry';
import { SectionFields } from './SectionFields';
import { BlockFields, type PageOption } from './BlockFields';
import { SortableList } from './Sortable';
import { AddSectionModal } from './AddSectionModal';
import { ConfirmDialog } from './ConfirmDialog';

function BlockRow({ block, sectionType, onChange, onRemove, pageOptions, storeId, mainCategoryId }: {
  block: Block;
  sectionType: string;
  onChange: (next: Block) => void;
  onRemove: () => void;
  pageOptions: PageOption[];
  storeId: string;
  mainCategoryId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const label = block.settings.label || block.settings.heading || block.settings.question || block.settings.text || block.settings.authorName || SECTION_META_BY_TYPE[sectionType as keyof typeof SECTION_META_BY_TYPE]?.blockLabel || block.type;

  return (
    <div className={`border rounded-lg bg-white transition-colors ${open ? 'border-brand-orange/30' : 'border-bone'}`}>
      <div className="flex items-center gap-1.5 pl-1 pr-2 py-1.5">
        <GripVertical size={13} className="text-bone shrink-0" />
        <button type="button" onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 flex items-center gap-2 bg-transparent border-none cursor-pointer text-left p-0 py-0.5">
          {open ? <ChevronUp size={13} className="text-slate shrink-0" /> : <ChevronDown size={13} className="text-slate shrink-0" />}
          <span className="text-[12.5px] font-medium text-charcoal truncate">{label || '(untitled)'}</span>
        </button>
        <button type="button" onClick={() => setConfirmingRemove(true)} className="text-error/70 text-[11px] font-semibold px-2 py-1 hover:bg-error-bg hover:text-error rounded-md bg-transparent border-none cursor-pointer shrink-0 transition-colors">Remove</button>
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-bone/70">
          <BlockFields type={block.type} settings={block.settings} onChange={settings => onChange({ ...block, settings })} pageOptions={pageOptions} storeId={storeId} mainCategoryId={mainCategoryId} />
        </div>
      )}
      {confirmingRemove && (
        <ConfirmDialog
          title="Remove item"
          message={`Remove "${label || '(untitled)'}"? This cannot be undone.`}
          confirmLabel="Remove"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={() => { setConfirmingRemove(false); onRemove(); }}
        />
      )}
    </div>
  );
}

function SectionCard({ section, onChange, onRemove, onPersistBlockRemove, pageOptions, storeId, mainCategoryId }: {
  section: Section;
  onChange: (next: Section) => void;
  onRemove: () => void;
  /** Called (with the section's new `blocks` already applied) specifically
   *  when a block inside this section is removed — saved immediately, same
   *  as removing the whole section, unlike an ordinary field edit. */
  onPersistBlockRemove: (next: Section) => void;
  pageOptions: PageOption[];
  storeId: string;
  mainCategoryId?: string;
}) {
  const [open, setOpen] = useState(true);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const meta = SECTION_META_BY_TYPE[section.type];

  return (
    <div className={`border rounded-2xl bg-white overflow-hidden transition-shadow ${open ? 'border-bone shadow-[0_1px_8px_rgba(0,0,0,0.04)]' : 'border-bone'}`}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${meta?.color ?? '#8C8A82'}18` }}>
          {meta ? <meta.Icon size={16} style={{ color: meta.color }} /> : <LayoutTemplate size={16} className="text-slate" />}
        </div>
        <button type="button" onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 flex flex-col items-start bg-transparent border-none cursor-pointer text-left p-0">
          <span className="text-[13.5px] font-bold text-charcoal truncate">{meta?.label ?? section.type}</span>
          {section.settings.heading && <span className="text-[11.5px] text-slate truncate">{section.settings.heading}</span>}
        </button>
        <button type="button" onClick={() => setOpen(o => !o)} aria-label={open ? 'Collapse' : 'Expand'}
          className="w-7 h-7 flex items-center justify-center text-slate rounded-md hover:bg-cream bg-transparent border-none cursor-pointer shrink-0">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button type="button" onClick={() => setConfirmingRemove(true)} aria-label="Remove section"
          className="w-7 h-7 flex items-center justify-center text-error/70 rounded-md hover:bg-error-bg hover:text-error bg-transparent border-none cursor-pointer shrink-0 transition-colors"><Trash2 size={14} /></button>
      </div>
      {confirmingRemove && (
        <ConfirmDialog
          title="Remove section"
          message={`Remove the "${meta?.label ?? section.type}" section and everything in it? This cannot be undone.`}
          confirmLabel="Remove Section"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={() => { setConfirmingRemove(false); onRemove(); }}
        />
      )}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-bone pt-3.5">
          <SectionFields type={section.type} settings={section.settings} onChange={settings => onChange({ ...section, settings })} storeId={storeId} mainCategoryId={mainCategoryId} />

          {meta && meta.allowedBlockTypes.length > 0 && (
            <div className="flex flex-col gap-2 bg-cream/50 rounded-xl p-3 -mx-1">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate px-1">{meta.blockLabel}s</p>
              <SortableList
                items={section.blocks}
                keyFor={(b, i) => b._id ?? `new-${i}`}
                onReorder={blocks => onChange({ ...section, blocks })}
              >
                {(block, i) => (
                  <BlockRow
                    block={block}
                    sectionType={section.type}
                    onChange={next => onChange({ ...section, blocks: section.blocks.map((b, j) => j === i ? next : b) })}
                    onRemove={() => {
                      const next = { ...section, blocks: section.blocks.filter((_, j) => j !== i) };
                      onChange(next);
                      onPersistBlockRemove(next);
                    }}
                    pageOptions={pageOptions}
                    storeId={storeId}
                    mainCategoryId={mainCategoryId}
                  />
                )}
              </SortableList>
              {meta.allowedBlockTypes.length === 1 ? (
                <button type="button" onClick={() => onChange({ ...section, blocks: [...section.blocks, { type: meta.allowedBlockTypes[0], settings: { ...meta.defaultBlockSettings } }] })}
                  className="text-[12px] font-semibold text-brand-orange bg-transparent border-none cursor-pointer text-left flex items-center gap-1 px-1 hover:underline">
                  <Plus size={13} /> Add {meta.blockLabel.toLowerCase()}
                </button>
              ) : (
                <ActionMenu
                  align="left"
                  trigger={<span className="text-[12px] font-semibold text-brand-orange cursor-pointer flex items-center gap-1"><Plus size={13} /> Add block</span>}
                  triggerClassName="self-start px-1 py-0.5 bg-transparent border-none cursor-pointer"
                  items={meta.allowedBlockTypes.map(bt => ({
                    label: bt.replace(/_/g, ' '),
                    onClick: () => onChange({ ...section, blocks: [...section.blocks, { type: bt, settings: {} }] }),
                  }))}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PageSectionsEditor({ sections, onChange, onPersist, pageOptions, storeId, mainCategoryId }: {
  sections: Section[];
  onChange: (next: Section[]) => void;
  /** Called (with the full next `Section[]`) whenever a section or a block
   *  inside one is removed — saves immediately, so a confirmed removal can
   *  never silently revert if the seller navigates away before clicking
   *  "Save Changes." Ordinary edits (reorder, field changes, add) still go
   *  through `onChange` only, unchanged. */
  onPersist: (next: Section[]) => void;
  pageOptions: PageOption[];
  storeId: string;
  mainCategoryId?: string;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {sections.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-14 border-2 border-dashed border-bone rounded-2xl bg-white/60 text-center px-6">
          <div className="w-12 h-12 rounded-xl bg-brand-pale-orange flex items-center justify-center">
            <LayoutTemplate size={22} className="text-brand-orange" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-charcoal">This page is empty</p>
            <p className="text-[12.5px] text-slate mt-1 max-w-[320px]">Add your first section — a hero banner, your products, or anything else — to start building this page.</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-[9px] mt-1 text-[13px] font-bold rounded-[9px] border-none text-white cursor-pointer transition-colors"
            style={{ background: '#174771' }}>
            <Plus size={14} /> Add Your First Section
          </button>
        </div>
      )}

      {sections.length > 0 && (
        <>
          <SortableList items={sections} keyFor={(s, i) => s._id ?? `new-${i}`} onReorder={onChange}>
            {(section, i) => (
              <SectionCard
                section={section}
                onChange={next => onChange(sections.map((s, j) => j === i ? next : s))}
                onRemove={() => {
                  const next = sections.filter((_, j) => j !== i);
                  onChange(next);
                  onPersist(next);
                }}
                onPersistBlockRemove={nextSection => onPersist(sections.map((s, j) => j === i ? nextSection : s))}
                pageOptions={pageOptions}
                storeId={storeId}
                mainCategoryId={mainCategoryId}
              />
            )}
          </SortableList>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-[10px] text-[13px] font-semibold rounded-[9px] border-2 border-dashed border-bone bg-transparent text-slate hover:border-brand-orange/40 hover:text-brand-orange cursor-pointer transition-colors"
          >
            <Plus size={14} /> Add Section
          </button>
        </>
      )}

      {showAdd && (
        <AddSectionModal
          onClose={() => setShowAdd(false)}
          onPick={type => {
            const meta = SECTION_META_BY_TYPE[type];
            onChange([...sections, { type, settings: { ...meta.defaultSettings }, blocks: [] }]);
          }}
        />
      )}
    </div>
  );
}
