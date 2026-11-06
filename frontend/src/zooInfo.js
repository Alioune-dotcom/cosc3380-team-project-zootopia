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

// sick or in quarantine = not on public display
export function isAnimalUnavailable(animal) {
  if (!animal) return false
  return Number(animal.IsSick) === 1 || animal.Enclosure === 'Quarantine Ward'
}

export const UNAVAILABLE_MESSAGE =
  'Resting with our vet team and not on display today. Come back and visit again soon!'
