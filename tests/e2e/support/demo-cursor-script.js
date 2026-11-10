/** Page overlay for demo recordings. The app CSP blocks inline styles, so the look lives in a constructed stylesheet. */
export function installCursor() {
  if (document.getElementById("demo-cursor")) return;

  const tip = 16;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    #demo-cursor {
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      width: 48px;
      height: 48px;
      left: 16px;
      top: 16px;
    }
    #demo-cursor .ring {
      position: absolute;
      left: 0;
      top: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid #1f1b16;
      box-shadow: 0 0 0 3px #fff, 0 0 0 5px #1f1b16;
      background: rgba(255, 253, 248, 0.55);
    }
    #demo-cursor svg {
      position: absolute;
      left: 9px;
      top: 11px;
      display: block;
    }
    #demo-cursor .ripple {
      position: absolute;
      left: 4px;
      top: 4px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid #8a2f1d;
      box-shadow: 0 0 0 2px #fff;
      opacity: 0;
    }
    #demo-cursor .ripple.go {
      animation: demo-cursor-ripple 220ms ease-out;
    }
    @keyframes demo-cursor-ripple {
      from { transform: scale(0.7); opacity: 1; }
      to { transform: scale(2.4); opacity: 0; }
    }
  `);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

  const root = document.createElement("div");
  root.id = "demo-cursor";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML =
    '<div class="ring"></div><svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 5 L7 24 L13 18.5 L18.5 27 L22.5 25 L17 16.5 L25 16 Z" fill="#1f1b16" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg><div class="ripple"></div>';
  document.documentElement.append(root);

  let x = 16;
  let y = 16;
  window.__demoCursorMove = (tipX, tipY) => {
    const left = tipX - tip;
    const top = tipY - tip;
    for (const anim of root.getAnimations()) anim.cancel();
    const anim = root.animate(
      [
        { left: `${x}px`, top: `${y}px` },
        { left: `${left}px`, top: `${top}px` },
      ],
      { duration: 400, easing: "ease", fill: "forwards" },
    );
    x = left;
    y = top;
    return anim.finished;
  };
}
