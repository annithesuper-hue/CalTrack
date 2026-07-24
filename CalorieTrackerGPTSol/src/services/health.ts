import type { MealEstimate } from '@/lib/types';

export async function enableHealthIntegration() {
  return false;
}

export async function syncNutritionToHealth(_meal: MealEstimate) {
  return;
}

