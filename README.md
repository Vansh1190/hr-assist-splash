# HR Assist — Splash / Onboarding

Static rebuild of the **HR Assist splash & onboarding** experience from the
Figma file *MSIL Enhancement Track* → page **HR Assist** → section
**“Splash -- Introduction screens (Current)”** (`node-id=7136-413`).

Live: https://vansh1190.github.io/hr-assist-splash/

## What is here

| File | Role |
| --- | --- |
| `index.html` | Mounts the experience into the 440 × 996 device stage. |
| `js/onboarding.js` | The splash screen module (stages 01 → 04) — this is the “onboarding.js” you review. |
| `js/signin.js` | Sign-in hand-off screen (visual pass pending its Figma node). |
| `css/onboarding.css` | Design tokens + every layer of the composition. 1 design px = `var(--u)`. |
| `assets/` | Logo, cockpit cutout and photography exported from the design. |
| `qa.html` | QA entry point: park the experience on any stage, snap the hold state. |

## Stage machine (all timings come from the design captions)

```
boot → bloom(01.1) → logo(01.2) → carousel(01.3) → card(02.1/02.2)
     → story(03.1–03.4) → hold(04.1) → engine(04.3) → launch(04.4) → done → sign-in
```

* **01.1** light blooms from the centre (0.8 s, `ease(0.4,0,0.2,1)`) and opens to white.
* **01.2** logo settles from 114 %, *Pride of India* is revealed by a light sweep.
* **01.3** cards spread out of the logo into three rows tilted 9°, outer rows drift in
  opposite directions, the 800-line card lands centred at 118 %, copy fades up.
  Tap anywhere to open the card sooner; it opens by itself after a 1.6 s hold.
* **02.x** the hero card straightens 9° → 0°, corners 20 → 0 and fills the screen.
* **03.x** cockpit rises 26 px under the photo, four stories auto-advance every 2.2 s
  with a 0.9 s cross-fade; a tap advances. **Start** already sits on the dash.
* **04.x** cockpit goes dark, hold **Start** for 1.2 s (release early → drains in 0.55 s),
  the engine catches, an orb of light fills the screen and the app opens.

## Dev

No build step, no dependencies.

```bash
python3 -m http.server 8099     # ES modules need http://, not file://
# http://127.0.0.1:8099/?at=story      any stage: bloom|logo|carousel|card|story|hold
# http://127.0.0.1:8099/qa.html?at=hold&hold=snap&p=0.62
```

Screenshots used for the design diff:

```bash
chrome --headless --window-size=440,996 --virtual-time-budget=4200 \
  --screenshot=out.png "http://127.0.0.1:8099/?at=carousel"
```

## Wiring it into the real app

```html
<script type="module">
  import { mountOnboarding } from './js/onboarding.js';
  import { mountSignIn } from './js/signin.js';

  mountOnboarding(document.getElementById('stage'), {
    onDone: () => mountSignIn(document.getElementById('stage'), {
      onSubmit: (user, { password }) => authApi.signIn(user, password),
    }),
  });
</script>
```

`mountOnboarding()` returns `{ replay, jumpTo, destroy }`. `prefers-reduced-motion`
collapses the springs to fades, shortens holds and disables haptics.
