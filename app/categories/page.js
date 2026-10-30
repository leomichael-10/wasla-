'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import CategoryIcon from '../../components/CategoryIcon'
import { useLocale } from '../../lib/LocaleContext'
import { t, categoryName } from '../../lib/i18n'

function CategoryTile({ category, locale }) {
  return (
    <Link
      href={`/products?category=${encodeURIComponent(category.name)}`}
      className="flex flex-col items-center gap-2 bg-wasla-card rounded-2xl border border-brand-100 hover:border-accent-300 transition-colors duration-200 py-4 px-2"
    >
      <span className="w-16 h-16 rounded-full bg-sand-50 flex items-center justify-center overflow-hidden">
        <CategoryIcon slug={category.icon} name={category.name} locale={locale} className="w-14 h-14" />
      </span>
      <span className="text-xs font-bold text-brand-800 text-center leading-tight"><bdi>{categoryName(category.name, locale)}</bdi></span>
    </Link>
  )
}

export default function CategoriesPage() {
  const { locale } = useLocale()
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [failed,     setFailed]     = useState(false)

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setCategories(data.categories ?? [])
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-sand-50">
      <Navbar />

      <div className="bg-wasla-card border-b border-brand-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-brand-400 mb-1">
            <Link href="/" className="hover:text-brand-600 transition-colors">{t('shops.home', locale)}</Link>
            <span>/</span>
            <span className="text-brand-700 font-medium">{t('categories.pageTitle', locale)}</span>
          </div>
          <h1 className="text-2xl font-black text-brand-900">{t('categories.pageTitle', locale)}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-wasla-card rounded-2xl border border-brand-100 animate-pulse py-4 px-2 h-28" />
            ))}
          </div>
        ) : failed || categories.length === 0 ? (
          <div className="bg-wasla-card rounded-2xl border border-brand-100 py-20 text-center">
            <p className="text-brand-500 font-semibold text-lg">{t('categories.empty', locale)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.map(category => (
              <CategoryTile key={category.id} category={category} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
