import type { KeyboardEvent } from "react"

/**
 * Rend activable au clavier un élément cliquable qui n'est pas un bouton (ligne de tableau, carte) :
 * il reçoit le focus avec Tab, se déclenche avec Entrée ou Espace, et s'annonce comme un bouton.
 */
export function activable(action: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: action,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.target !== event.currentTarget) return
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        action()
      }
    },
  }
}
