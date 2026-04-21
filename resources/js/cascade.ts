/**
 * Single source of truth for the basket → sub-basket → market enable/disable
 * cascade. Called both on hydration (loadState) and on toggle changes (wire).
 */

type Toggle = HTMLInputElement

function all<T extends HTMLElement = Toggle>(selector: string): T[] {
  return Array.from(document.querySelectorAll<T>(selector))
}

export function applyCascade(): void {
  all<Toggle>('.basket-toggle').forEach((b) => {
    const basket = b.dataset.basket
    if (!basket) return
    const sub = all<Toggle>(`.subbasket-toggle[data-basket="${basket}"]`)
    const mkt = all<Toggle>(`.market-toggle[data-basket="${basket}"]`)
    if (!b.checked) {
      sub.forEach((s) => (s.disabled = true))
      mkt.forEach((m) => (m.disabled = true))
    }
  })
  all<Toggle>('.subbasket-toggle').forEach((s) => {
    const id = s.dataset.subbasket
    if (!id) return
    if (!s.checked) {
      all<Toggle>(`.market-toggle[data-subbasket="${id}"]`).forEach(
        (m) => (m.disabled = true)
      )
    }
  })
}

/** Clicking a basket propagates check+disabled state to its descendants. */
export function cascadeFromBasket(el: Toggle): void {
  const basket = el.dataset.basket
  if (!basket) return
  all<Toggle>(`.subbasket-toggle[data-basket="${basket}"]`).forEach((s) => {
    s.checked = el.checked
    s.disabled = !el.checked
  })
  all<Toggle>(`.market-toggle[data-basket="${basket}"]`).forEach((m) => {
    m.checked = el.checked
    m.disabled = !el.checked
  })
}

/** Clicking a sub-basket propagates to its markets. */
export function cascadeFromSubBasket(el: Toggle): void {
  const sub = el.dataset.subbasket
  if (!sub) return
  all<Toggle>(`.market-toggle[data-subbasket="${sub}"]`).forEach((m) => {
    m.checked = el.checked
    m.disabled = !el.checked
  })
}
