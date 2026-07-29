// Minimal dictionary-based i18n. Arabic is the default locale (Wasla is
// Arabic-first); English is the secondary toggle. This intentionally covers
// only the highest-traffic surfaces (layout/footer, nav, homepage hero,
// zone gate, cart) rather than every string in the app — see DECISIONS.md
// for why full-app translation was scoped out of this pass.

export const DEFAULT_LOCALE = 'ar'
export const LOCALE_COOKIE  = 'wasla_locale'

const dict = {
  ar: {
    'nav.products':        'المنتجات',
    'nav.shops':           'المتاجر',
    'nav.cart':            'السلة',
    'nav.orders':          'طلباتي',
    'nav.login':           'تسجيل الدخول',
    'nav.search':          'ابحث عن منتجات، متاجر...',
    'footer.tagline':      'منتجات سودانية توصلك',
    'footer.products':     'المنتجات',
    'footer.terms':        'الشروط والأحكام',
    'footer.privacy':      'سياسة الخصوصية',
    'footer.rights':       'جميع الحقوق محفوظة',
    'home.tag':            'منتجات سودانية توصلك',
    'home.heading1':       'اطلب من أفضل',
    'home.heading2':       'المتاجر السودانية في القاهرة',
    'home.subheading':     'قهوة وبهارات ومنتجات تراثية من متاجر سودانية موثوقة — توصلك لباب البيت.',
    'home.searchPlaceholder': 'ابحث عن منتجات، ماركات، خيارات...',
    'home.search':         'بحث',
    'home.verifiedShops':  'متجر موثوق',
    'home.cod':            'الدفع عند الاستلام',
    'home.sameDay':        'توصيل في نفس اليوم بالقاهرة',
    'cart.title':          'سلتك',
    'cart.subtotal':       'المجموع الفرعي',
    'cart.delivery':       'التوصيل',
    'cart.total':          'الإجمالي',
    'cart.checkout':       'تأكيد الطلب',
    'zone.title':          'وين نوصلك؟',
    'zone.subtitle':       'اختر منطقتك — التوصيل في نفس اليوم متاح في مناطق القاهرة والجيزة دي.',
    'pwa.installTitle':    'ثبّت تطبيق وصلة',
    'pwa.installBody':     'أضف وصلة لشاشتك الرئيسية عشان توصل بسرعة من غير متصفح.',
    'pwa.installButton':   'تثبيت',
    'pwa.iosBody':         'لإضافة وصلة لشاشتك الرئيسية: اضغط زر المشاركة',
    'pwa.iosThenTap':      'بعدين اختر "إضافة إلى الشاشة الرئيسية"',
    'pwa.dismiss':         'مش الآن',
  },
  en: {
    'nav.products':        'Products',
    'nav.shops':           'Shops',
    'nav.cart':            'Cart',
    'nav.orders':          'My Orders',
    'nav.login':           'Sign in',
    'nav.search':          'Search products, shops...',
    'footer.tagline':      'Sudanese products, delivered',
    'footer.products':     'Products',
    'footer.terms':        'Terms of Service',
    'footer.privacy':      'Privacy Policy',
    'footer.rights':       'All rights reserved',
    'home.tag':            'Sudanese products, delivered',
    'home.heading1':       'Order from the best',
    'home.heading2':       'Sudanese shops in Cairo',
    'home.subheading':     'Coffee, spices, and heritage goods from verified Sudanese shops — delivered to your door.',
    'home.searchPlaceholder': 'Search products, brands, options...',
    'home.search':         'Search',
    'home.verifiedShops':  'Verified Shops',
    'home.cod':            'Cash on Delivery',
    'home.sameDay':        'Same-Day Cairo Delivery',
    'cart.title':          'Your Cart',
    'cart.subtotal':       'Subtotal',
    'cart.delivery':       'Delivery',
    'cart.total':          'Total',
    'cart.checkout':       'Confirm Order',
    'zone.title':          'Where should we deliver?',
    'zone.subtitle':       "Choose your area — same-day delivery is available in these areas of Cairo & Giza.",
    'pwa.installTitle':    'Install the Wasla app',
    'pwa.installBody':     'Add Wasla to your home screen for faster access, no browser needed.',
    'pwa.installButton':   'Install',
    'pwa.iosBody':         'To add Wasla to your home screen: tap the Share button',
    'pwa.iosThenTap':      'then choose "Add to Home Screen"',
    'pwa.dismiss':         'Not now',
  },
}

export function t(key, locale = DEFAULT_LOCALE) {
  return dict[locale]?.[key] ?? dict[DEFAULT_LOCALE][key] ?? key
}

export function getLocaleCookie() {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : DEFAULT_LOCALE
}

export function setLocaleCookie(locale) {
  if (typeof document === 'undefined') return
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`
  window.location.reload()
}
