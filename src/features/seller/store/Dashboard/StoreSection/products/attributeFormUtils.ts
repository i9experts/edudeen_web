import type { AttributeDefinition, ProductAttributeInput } from '@/api/services/attributes';

export type AttributeValuesState = Record<string, string[]>; // attributeDefinitionId -> values

/** Turns the field-keyed state into the payload `apiSetProductAttributes` expects,
 *  dropping attributes with no value so clearing a field actually clears it. */
export function toAttributeInputs(state: AttributeValuesState): ProductAttributeInput[] {
  return Object.entries(state)
    .filter(([, values]) => values.length > 0)
    .map(([attributeDefinitionId, values]) => ({ attributeDefinitionId, values }));
}

/** True when every `required` definition currently has a value — call before
 *  submit so the seller gets a clear "X is required" instead of a 400 from the server. */
export function findMissingRequiredAttribute(
  definitions: AttributeDefinition[],
  state: AttributeValuesState,
): AttributeDefinition | null {
  return definitions.find(d => d.required && !(state[d._id]?.length > 0)) ?? null;
}
