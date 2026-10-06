import { getShotIndex, getLocalProgress, getAllShots, getShotCount } from './camera-rig.js?v=20260806-p5p';

const urlParams = new URLSearchParams(window.location.search);
const isDebugMode = urlParams.get('debug') === '1';

let hudRoot = null, hudVisible = false;
let txtTitle = null, txtGlobal = null, txtLocal = null;
let txtCamPos = null, txtCamTarget = null, txtFov = null;
let txtTrans = null, txtKeys = null;

export function createDebugHUD() {
  if (!isDebugMode) return null;
  hudRoot = document.createElement('div');
  hudRoot.id = 'phase5-debug-hud';
  // Small windows: shrink the panel so it never covers the subject
  const small = window.innerWidth < 900;
  hudRoot.style.cssText = `
    position:fixed;top:10px;right:10px;z-index:200;
    background:rgba(0,0,0,0.82);border:1px solid rgba(255,255,255,0.15);
    border-radius:8px;padding:${small ? '8px 10px' : '12px 16px'};font-family:'Courier New',monospace;
    font-size:${small ? '9px' : '11px'};color:#8f8;line-height:1.6;min-width:${small ? '210px' : '290px'};
    max-width:44vw;overflow:hidden;
    pointer-events:none;user-select:none;backdrop-filter:blur(4px);
  `;
  hudRoot.innerHTML = `
    <div style="font-size:13px;font-weight:bold;color:#ff0;margin-bottom:4px;" id="hud-title">--</div>
    <div>Global: <span id="hud-global" style="color:#fff;">0%</span></div>
    <div>Local:  <span id="hud-local" style="color:#fff;">0%</span></div>
    <div style="margin-top:4px;color:#888;">Cam Pos:</div>
    <div id="hud-pos" style="color:#fff;">--</div>
    <div style="color:#888;">Cam Target:</div>
    <div id="hud-target" style="color:#fff;">--</div>
    <div>FOV: <span id="hud-fov" style="color:#fff;">--</span></div>
    <div style="margin-top:4px;color:#f80;" id="hud-trans"></div>
    <div style="margin-top:6px;font-size:9px;color:#666;" id="hud-keys">[] nav shots | 0-9 quick jump</div>
  `;
  document.body.appendChild(hudRoot);
  txtTitle = document.getElementById('hud-title');
  txtGlobal = document.getElementById('hud-global');
  txtLocal = document.getElementById('hud-local');
  txtCamPos = document.getElementById('hud-pos');
  txtCamTarget = document.getElementById('hud-target');
  txtFov = document.getElementById('hud-fov');
  txtTrans = document.getElementById('hud-trans');
  txtKeys = document.getElementById('hud-keys');
  hudVisible = true;
  return hudRoot;
}

export function updateDebugHUD(progress, camera, screenProj) {
  if (!hudVisible || !txtTitle) return;
  const shotIdx = getShotIndex(progress);
  const shots = getAllShots();
  const shot = shots[shotIdx];
  const localP = getLocalProgress(progress, shotIdx);
  const total = getShotCount();

  let titleLine = `Shot ${String(shotIdx+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}  ${shot ? (shot.n || shot.name || '???') : '???'}`;
  if (screenProj) {
    if (screenProj.particle) titleLine += ` | ${screenProj.particle}`;
    if (screenProj.capsule) titleLine += ` | Caps: ${screenProj.capsule}`;
    if (screenProj.node)    titleLine += ` | Node: ${screenProj.node}`;
    if (screenProj.tri)     titleLine += ` | Tri: ${screenProj.tri}`;
  }
  txtTitle.textContent = titleLine;
  txtGlobal.textContent = `${(progress*100).toFixed(1)}%`;
  txtLocal.textContent = `${(localP*100).toFixed(1)}%`;

  if (camera) {
    const p = camera.position;
    const f3 = (v) => Number.isFinite(v) ? v.toFixed(2) : '0.00';
    txtCamPos.textContent = `(${f3(p.x)}, ${f3(p.y)}, ${f3(p.z)})`;
    const lt = camera.userData?.debugLookTarget;
    txtCamTarget.textContent = lt ? `(${f3(lt.x)}, ${f3(lt.y)}, ${f3(lt.z)})` : '(--)';
    txtFov.textContent = `${Number.isFinite(camera.fov) ? camera.fov.toFixed(1) : '--'}°`;
  }

  // Transition info
  let tText = '';
  if (shot?.enterOcc) tText += `← ${shot.enterOcc} `;
  if (shot?.exitOcc) tText += `→ ${shot.exitOcc}`;
  txtTrans.textContent = tText;
}

/** Setup bracket navigation: [ = previous shot, ] = next shot. Uses vfy points. */
export function setupDebugKeyboard(jumpFn) {
  if (!isDebugMode) return;

  let _currentShot = 0;

  window.addEventListener('keydown', (e) => {
    const shots = getAllShots();
    const total = shots.length;

    if (e.key === '[') { _currentShot = Math.max(0, _currentShot - 1); jumpFn(shots[_currentShot].vfy); return; }
    if (e.key === ']') { _currentShot = Math.min(total - 1, _currentShot + 1); jumpFn(shots[_currentShot].vfy); return; }

    const keyNum = parseInt(e.key);
    if (!isNaN(keyNum) && keyNum >= 0 && keyNum <= 9) {
      _currentShot = Math.min(total - 1, Math.round(keyNum * (total - 1) / 9));
      jumpFn(shots[_currentShot].vfy);
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const cur = parseFloat(txtGlobal?.textContent || '0') / 100 || 0;
      jumpFn(Math.max(0, Math.min(1, cur + (e.key === 'ArrowRight' ? 0.005 : -0.005))));
    }
  });

  if (txtKeys) txtKeys.textContent = '[] nav shots | 0-9 quick jump | ←→ fine-tune';
}

export function isDebug() { return isDebugMode; }
