// zoo info used on more than one page
// prices could come from the db later

export const TICKETS = [
  { type: 'Adult', price: 29.99 },
  { type: 'Child', price: 19.99 },
  { type: 'Senior', price: 24.99 },
]

/** Habitats guests/cashiers can pick for visits — not Quarantine Ward */
export function isPublicEnclosure(enclosure) {
  if (!enclosure) return false
  if (enclosure.Name === 'Quarantine Ward') return false
  if (enclosure.HabitatType === 'Medical') return false
  return true
}
