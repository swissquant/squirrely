import type { HttpContext } from '@adonisjs/core/http'
import {
  BASKETS,
  BASKET_LABELS,
  subBasketsByBasket,
  marketsBySubBasket,
  isBasketNested,
  DEFAULT_ENABLED_BASKETS,
  DEFAULT_ENABLED_SUB_BASKETS,
  DEFAULT_ENABLED_MARKETS,
} from '#config/markets'

export default class HomeController {
  async show({ view }: HttpContext) {
    const baskets = BASKETS.map((b) => ({
      id: b,
      label: BASKET_LABELS[b],
      nested: isBasketNested(b),
      enabled: DEFAULT_ENABLED_BASKETS.has(b),
      subBaskets: subBasketsByBasket(b).map((sb) => ({
        id: sb.id,
        label: sb.label,
        enabled: DEFAULT_ENABLED_SUB_BASKETS.has(sb.id),
        markets: marketsBySubBasket(sb.id).map((m) => ({
          ...m,
          enabled: DEFAULT_ENABLED_MARKETS.has(m.id),
        })),
      })),
    }))
    return view.render('pages/home', { baskets })
  }
}
