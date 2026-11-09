// dropdown lists used on more than one page
// the database has CHECK constraints with these same values

export const HABITAT_TYPES = [
  'Savanna',
  'Grassland',
  'Aquatic',
  'Rainforest',
  'Desert',
  'Arctic',
  'Forest',
  'Aviary',
  'Reptile House',
  'Medical',
]

// IUCN Red List categories
export const CONSERVATION_STATUSES = [
  'Least Concern',
  'Near Threatened',
  'Vulnerable',
  'Endangered',
  'Critically Endangered',
  'Extinct in the Wild',
  'Data Deficient',
]

// places in the zoo, shared by enclosures and shops
// (the online store's location is always "Online" and isn't picked from here)
export const LOCATIONS = ['Zone A', 'Zone B', 'Zone C', 'Main Plaza', 'Vet Wing']

// which product categories each shop type can sell
export const CATEGORIES_BY_SHOP_TYPE = {
  Food: ['Food', 'Drink'],
  Gift: ['Merchandise', 'Apparel'],
  Online: ['Merchandise', 'Apparel'],
}
