'use client'
import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { t, productName } from '../lib/i18n'

const DEBOUNCE_MS = 280
const MIN_QUERY_LENGTH = 2

function suggestionHref(item) {
  if (item.kind === 'product') return `/products/${item.id}`
  return item.type === 'RESTAURANT' ? `/restaurant/${item.id}` : `/shops/${item.id}`
}

function SuggestionRow({ id, item, label, price, active, onSelect }) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={e => e.preventDefault()}
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-2 text-start transition-colors ${active ? 'bg-accent-50' : 'hover:bg-gray-50'}`}
    >
      <span className="w-9 h-9 rounded-lg bg-[#FBF6EF] shrink-0 overflow-hidden flex items-center justify-center">
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-black text-brand-200">{label?.[0]?.toUpperCase() ?? '?'}</span>
        )}
      </span>
      <span className="flex-1 min-w-0 text-xs font-bold text-gray-900 truncate">{label}</span>
      {price != null && (
        <span className="text-xs font-black text-gray-900 shrink-0">EGP {price.toFixed(0)}</span>
      )}
    </button>
  )
}

// Header search bar with a debounced autocomplete dropdown (products +
// shops/restaurants). Rendered twice by components/Navbar.js — once for
// the always-visible desktop bar, once for the mobile toggle panel — each
// instance owns its own query/suggestions state and network requests.
//
// The dropdown is rendered into document.body via a portal and positioned
// with `position: fixed` computed from the input's own bounding rect,
// rather than `absolute` inside the input's own wrapper. The mobile panel
// it lives in (Navbar's collapsible search row) is height-clipped with
// `overflow-hidden` for its open/close slide animation — an absolutely
// positioned dropdown would be clipped by that same overflow, so it has to
// escape via a portal instead. Fixed-position coordinates come straight
// from getBoundingClientRect(), which is already direction-agnostic (true
// viewport coordinates), so this works unchanged in RTL.
export default function SearchAutocomplete({
  locale,
  id,
  autoFocus = false,
  formClassName,
  inputClassName,
  buttonClassName,
  onNavigate,
}) {
  const router = useRouter()
  const [query,          setQuery]          = useState('')
  const [suggestions,    setSuggestions]    = useState({ products: [], shops: [] })
  const [open,           setOpen]           = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [highlightedKey, setHighlightedKey] = useState(null)
  const [rect,           setRect]           = useState(null)

  const wrapRef     = useRef(null)
  const dropdownRef = useRef(null)

  const flatItems = useMemo(() => {
    const products = suggestions.products.map(p => ({
      key:   `product-${p.id}`,
      kind:  'product',
      id:    p.id,
      label: productName(p, locale),
      image: p.image,
      price: p.price,
    }))
    const shops = suggestions.shops.map(s => ({
      key:   `shop-${s.id}`,
      kind:  'shop',
      id:    s.id,
      type:  s.type,
      label: s.name,
      image: s.logoUrl,
    }))
    return [...products, ...shops]
  }, [suggestions, locale])

  // Debounce + min-length gate + cancel-on-supersede. Runs on every
  // keystroke; the effect cleanup from the *previous* keystroke clears
  // its pending timer and aborts its in-flight fetch (if any) before this
  // one starts, so a slow response for an old term can never land after
  // (and overwrite) a newer one.
  useEffect(() => {
    const term = query.trim()
    if (term.length < MIN_QUERY_LENGTH) {
      setSuggestions({ products: [], shops: [] })
      setOpen(false)
      setLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setOpen(true)
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        if (!res.ok) throw new Error('Search request failed')
        const data = await res.json()
        if (cancelled) return
        setSuggestions({ products: data.products ?? [], shops: data.shops ?? [] })
        setHighlightedKey(null)
      } catch (err) {
        if (cancelled || err.name === 'AbortError') return
        setSuggestions({ products: [], shops: [] })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => { cancelled = true; clearTimeout(timer); controller.abort() }
  }, [query])

  // Position the portaled dropdown under the input, in viewport
  // coordinates, and keep it pinned there through resize/scroll while open.
  useLayoutEffect(() => {
    if (!open) return
    function updateRect() {
      if (!wrapRef.current) return
      const r = wrapRef.current.getBoundingClientRect()
      setRect({ top: r.bottom, left: r.left, width: r.width })
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e) {
      if (wrapRef.current?.contains(e.target)) return
      if (dropdownRef.current?.contains(e.target)) return
      closeDropdown()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function closeDropdown() {
    setOpen(false)
    setHighlightedKey(null)
  }

  function runFullSearch() {
    const q = query.trim()
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : '/products')
    closeDropdown()
    onNavigate?.()
  }

  function handleSelect(item) {
    router.push(suggestionHref(item))
    closeDropdown()
    onNavigate?.()
  }

  function handleSubmit(e) {
    e.preventDefault()
    runFullSearch()
  }

  function handleFocus() {
    if (query.trim().length >= MIN_QUERY_LENGTH && flatItems.length > 0) setOpen(true)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (open) { e.preventDefault(); closeDropdown() }
      return
    }
    if (!open || flatItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = flatItems.findIndex(it => it.key === highlightedKey)
      setHighlightedKey(flatItems[(idx + 1) % flatItems.length].key)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = flatItems.findIndex(it => it.key === highlightedKey)
      setHighlightedKey(flatItems[(idx - 1 + flatItems.length) % flatItems.length].key)
    } else if (e.key === 'Enter' && highlightedKey) {
      const item = flatItems.find(it => it.key === highlightedKey)
      if (item) { e.preventDefault(); handleSelect(item) }
    }
  }

  const listboxId = `${id}-listbox`
  const productItems = flatItems.filter(it => it.kind === 'product')
  const shopItems    = flatItems.filter(it => it.kind === 'shop')

  return (
    <form onSubmit={handleSubmit} className={formClassName}>
      <div ref={wrapRef} className="relative w-full">
        <input
          type="text"
          id={id}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={t('nav.search', locale)}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={highlightedKey ? `${id}-opt-${highlightedKey}` : undefined}
          className={inputClassName}
        />
        <button type="submit" aria-label="Search" className={buttonClassName}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
      </div>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          style={{ position: 'fixed', top: (rect?.top ?? 0) + 4, left: rect?.left ?? 0, width: rect?.width ?? 'auto' }}
          className="z-100 max-h-[70vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-brand-100 py-2"
        >
          {loading ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400">…</p>
          ) : flatItems.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400">{t('search.noResults', locale)}</p>
          ) : (
            <>
              {productItems.length > 0 && (
                <div>
                  <p className="px-4 pt-1 pb-1.5 text-[11px] font-black uppercase tracking-wide text-gray-400">{t('nav.products', locale)}</p>
                  {productItems.map(item => (
                    <SuggestionRow
                      key={item.key}
                      id={`${id}-opt-${item.key}`}
                      item={item}
                      label={item.label}
                      price={item.price}
                      active={item.key === highlightedKey}
                      onSelect={() => handleSelect(item)}
                    />
                  ))}
                </div>
              )}
              {shopItems.length > 0 && (
                <div>
                  <p className="px-4 pt-2 pb-1.5 text-[11px] font-black uppercase tracking-wide text-gray-400">{t('search.shops', locale)}</p>
                  {shopItems.map(item => (
                    <SuggestionRow
                      key={item.key}
                      id={`${id}-opt-${item.key}`}
                      item={item}
                      label={item.label}
                      price={null}
                      active={item.key === highlightedKey}
                      onSelect={() => handleSelect(item)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </form>
  )
}
