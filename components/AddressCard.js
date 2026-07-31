'use client'
import { t } from '../lib/i18n'

// Compact display of a saved address — used in the checkout picker and the
// Account page's address list. `selectable` renders it as a radio card;
// otherwise it renders action buttons (edit/delete/set-default).
export default function AddressCard({
  address, locale, selectable, selected, onSelect,
  onEdit, onDelete, onSetDefault,
}) {
  const zoneName = locale === 'ar' ? address.zone?.nameAr : address.zone?.nameEn

  const body = (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        {address.label && (
          <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{address.label}</span>
        )}
        {address.isDefault && (
          <span className="text-xs font-bold bg-accent-100 text-accent-700 px-2 py-0.5 rounded-full">{t('address.default', locale)}</span>
        )}
      </div>
      <p className="text-sm text-gray-800 font-semibold mt-1.5 leading-snug">
        {[
          address.building && `${t('address.building', locale)} ${address.building}`,
          address.floor && `${t('address.floor', locale)} ${address.floor}`,
          address.apartment && `${t('address.apartment', locale)} ${address.apartment}`,
        ].filter(Boolean).join(' · ')}
      </p>
      <p className="text-sm text-gray-500 mt-0.5">
        {[address.area, zoneName].filter(Boolean).join(' — ')}
      </p>
      {address.landmark && (
        <p className="text-xs text-accent-600 font-semibold mt-1">📍 {address.landmark}</p>
      )}
      {address.contactPhone && (
        <p className="text-xs text-gray-400 mt-1">{address.contactPhone}</p>
      )}
    </div>
  )

  if (selectable) {
    return (
      <label className={`flex items-start gap-3 border rounded-2xl p-4 cursor-pointer transition-colors ${
        selected ? 'border-brand-500 bg-brand-50/50' : 'border-gray-200 hover:border-brand-200'
      }`}>
        <input
          type="radio" checked={selected} onChange={() => onSelect?.(address)}
          className="mt-1 accent-brand-600 shrink-0"
        />
        {body}
      </label>
    )
  }

  return (
    <div className="flex items-start gap-3 border border-gray-200 rounded-2xl p-4">
      {body}
      <div className="flex flex-col items-end gap-1.5 shrink-0 text-xs font-bold">
        {!address.isDefault && onSetDefault && (
          <button onClick={() => onSetDefault(address)} className="text-brand-600 hover:text-brand-800 transition-colors">
            {t('address.setDefault', locale)}
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(address)} className="text-gray-500 hover:text-gray-700 transition-colors">
            {t('address.edit', locale)}
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(address)} className="text-red-400 hover:text-red-600 transition-colors">
            {t('address.delete', locale)}
          </button>
        )}
      </div>
    </div>
  )
}
