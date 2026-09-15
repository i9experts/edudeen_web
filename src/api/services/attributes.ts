import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AttributeValueType = 'text' | 'select' | 'multiselect';

export interface AttributeDefinition {
  _id:         string;
  categoryId:  string;
  key:         string;
  label:       string;
  type:        AttributeValueType;
  options:     string[];
  required:    boolean;
  searchable:  boolean;
  sortOrder:   number;
}

export interface CreateAttributeDefinitionPayload {
  key:         string;
  label:       string;
  type?:       AttributeValueType;
  options?:    string[];
  required?:   boolean;
  searchable?: boolean;
  sortOrder?:  number;
}

export interface UpdateAttributeDefinitionPayload {
  label?:      string;
  type?:       AttributeValueType;
  options?:    string[];
  required?:   boolean;
  searchable?: boolean;
  sortOrder?:  number;
  isDelete?:   boolean;
}

export interface ProductAttributeValue {
  attributeDefinitionId: string;
  key:                   string;
  label:                 string;
  type:                  AttributeValueType;
  values:                string[];
}

export interface ProductAttributeInput {
  attributeDefinitionId: string;
  values:                string[];
}

interface AttributeDefinitionListResponse { success: boolean; message: string; data: AttributeDefinition[] }
interface AttributeDefinitionResponse { success: boolean; message: string; data: AttributeDefinition }
interface ProductAttributeListResponse { success: boolean; message: string; data: ProductAttributeValue[] }

// ── API ───────────────────────────────────────────────────────────────────────

export function apiGetCategoryAttributes(categoryId: string) {
  return client.get<never, AttributeDefinitionListResponse>(
    ENDPOINTS.ATTRIBUTES.LIST_FOR_CATEGORY(categoryId),
  );
}

export function apiCreateAttributeDefinition(categoryId: string, payload: CreateAttributeDefinitionPayload) {
  return client.post<never, AttributeDefinitionResponse>(
    ENDPOINTS.ATTRIBUTES.CREATE_FOR_CATEGORY(categoryId),
    payload,
  );
}

export function apiUpdateAttributeDefinition(id: string, payload: UpdateAttributeDefinitionPayload) {
  return client.patch<never, AttributeDefinitionResponse>(ENDPOINTS.ATTRIBUTES.UPDATE(id), payload);
}

export function apiDeleteAttributeDefinition(id: string) {
  return client.delete<never, AttributeDefinitionResponse>(ENDPOINTS.ATTRIBUTES.DELETE(id));
}

export function apiGetProductAttributes(productId: string) {
  return client.get<never, ProductAttributeListResponse>(ENDPOINTS.ATTRIBUTES.GET_FOR_PRODUCT(productId));
}

export function apiSetProductAttributes(productId: string, attributes: ProductAttributeInput[]) {
  return client.put<never, ProductAttributeListResponse>(
    ENDPOINTS.ATTRIBUTES.SET_FOR_PRODUCT(productId),
    { attributes },
  );
}
