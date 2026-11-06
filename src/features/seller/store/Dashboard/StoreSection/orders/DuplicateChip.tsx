/** Advisory chip: another live order from the same buyer with the same products within 24 h. */
export function DuplicateChip({ other }: { other?: { orderNumber: string } | null }) {
  if (!other) return null;
  return (
    <span
      className="inline-flex w-fit items-center rounded-full bg-warning-bg px-2 py-[2px] text-[12px] font-semibold text-warning whitespace-nowrap"
      title={`Same buyer, same products as order ${other.orderNumber} within 24 hours`}
    >
      Possible duplicate
    </span>
  );
}
