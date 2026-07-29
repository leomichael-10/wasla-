// Hand-drawn line-art icons per Sudanese category — replaces the generic
// shopping-bag/emoji placeholder. Monoline, consistent stroke weight,
// intentionally NOT a generic e-commerce icon set (see DECISIONS.md).
const ICONS = {
  'Coffee & Jabana': (
    // jabana — the long-necked Sudanese coffee pot
    <path d="M9 21h6M8 21c-.5-3 0-6 1-8V7a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v1.2c1.8.4 3 1.6 3 3.3 0 1.7-1.4 3-3.2 3.2M16 21c.5-3 0-6-1-8M9 8h6" />
  ),
  'Tea & Drinks': (
    // glass of karkade with a slice + steam
    <path d="M7 9h10l-1 10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L7 9ZM6 9h12M10 4.5c0 1-1 1-1 2s1 1 1 2M14 4.5c0 1-1 1-1 2s1 1 1 2" />
  ),
  'Spices & Seasonings': (
    // chili + spice jar
    <path d="M9 8c3-2 6 0 5 3-.7 2-3 2.5-4.5 1.5C8 11.3 7.5 9.3 9 8Z M14 11c1.5 0 3 1 3 3s-1.5 4-3.5 4S10 16 10 14M4 15h4v4a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2v-4Z" />
  ),
  'Dakwa & Peanut Products': (
    // peanut shell
    <path d="M9 4.5c-2.5 0-4 2-4 4.5 0 1 .3 1.8.8 2.5-.5.7-.8 1.5-.8 2.5 0 2.5 1.5 4.5 4 4.5s4-2 4-4.5c0-1-.3-1.8-.8-2.5.5-.7.8-1.5.8-2.5 0-2.5-1.5-4.5-4-4.5Z" />
  ),
  'Weika & Dried Goods': (
    // okra pod
    <path d="M12 3c3 3 4 8 2.5 13-.6 2-2 4-2.5 5-.5-1-1.9-3-2.5-5C8 11 9 6 12 3ZM12 3v18" />
  ),
  'Grains & Flour': (
    // wheat stalk
    <path d="M12 21V9M12 9c-1.5-1-1.5-3 0-4 1.5 1 1.5 3 0 4ZM9 11c-1.5-.5-2-2-1-3.5 1.6.2 2.3 1.6 1 3.5ZM15 11c1.5-.5 2-2 1-3.5-1.6.2-2.3 1.6-1 3.5ZM9 15c-1.5-.5-2-2-1-3.5 1.6.2 2.3 1.6 1 3.5ZM15 15c1.5-.5 2-2 1-3.5-1.6.2-2.3 1.6-1 3.5Z" />
  ),
  'Oils & Ghee': (
    // oil jar with spout
    <path d="M9 3h4v2.2c1.8.6 3 2.3 3 4.3v8a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-8c0-2 1.2-3.7 3-4.3V3ZM9 3H8M9 10.5h6" />
  ),
  'Sweets & Snacks': (
    // wrapped sweet / halva bar
    <path d="M4 12l3-3h10l3 3-3 3H7l-3-3ZM7 9V7M17 9V7M7 15v2M17 15v2" />
  ),
  'Bakhour & Perfumes': (
    // incense burner with smoke curl
    <path d="M6 20h12M8 20l1-6h6l1 6M9 14c0-3 1-4 1-6M12 6c1 1 1.5 2 .8 3.2C12 10 11 9.5 11 8.3c0-1 .6-1.6 1-2.3Z" />
  ),
  'Heritage Clothing': (
    // thobe on a hanger
    <path d="M12 4a2 2 0 0 1 2 2h-4a2 2 0 0 1 2-2ZM12 6v2M6 8l6-2 6 2-2 2 1 10H7l1-10-2-2Z" />
  ),
  'Homeware & Handicrafts': (
    // woven basket
    <path d="M5 10h14l-1.5 9a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 10ZM4 10h16M8 10c0-3 1.8-5 4-5s4 2 4 5M9 13v5M12 13v5M15 13v5" />
  ),
}

export default function CategoryIcon({ name, className = 'w-7 h-7' }) {
  const path = ICONS[name]
  if (!path) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16l-1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 7ZM8 7V5a4 4 0 0 1 8 0v2" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}
