import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from "@shared/types";

export interface ProductCounts {
  total: number;
  byCategory: Record<ProductCategory, number>;
}

/**
 * Counts active (non-archived) projects per category in a single pass.
 * Used by the sidebar filter chips so the numbers stay in sync with the list.
 */
export function countActiveByCategory(products: Product[]): ProductCounts {
  const byCategory = Object.fromEntries(
    PRODUCT_CATEGORIES.map((cat) => [cat.value, 0])
  ) as Record<ProductCategory, number>;

  let total = 0;
  for (const product of products) {
    if (product.archivedAt) continue;
    total += 1;
    byCategory[product.category] = (byCategory[product.category] ?? 0) + 1;
  }

  return { total, byCategory };
}
