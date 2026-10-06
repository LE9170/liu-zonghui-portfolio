// Detect quality tier based on DPR, screen width, hardwareConcurrency, mobile UA
// Export: quality = { tier: 'high'|'medium'|'low', dprCap, shadowEnabled, particleMult, coralMult, waterSegments, bloomStrength }
// High: DPR≥2, screen≥1440, cores≥6, not mobile → dprCap:2, shadows:true, particles:1.0, corals:1.0, waterSegments:80, bloom:0.25
// Medium: default → dprCap:1.5, shadows:true, particles:0.6, corals:0.5, waterSegments:60, bloom:0.15
// Low: mobile or DPR<1.5 or screen<768 or cores≤4 → dprCap:1, shadows:false, particles:0.3, corals:0.3, waterSegments:40, bloom:0
// Read from sessionStorage on init to avoid re-detection on refresh
// Never change tier mid-session

const STORAGE_KEY = 'phase3_quality_tier';

function detectQuality() {
  // Check sessionStorage first
  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { /* re-detect */ }
  }

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cores = navigator.hardwareConcurrency || 4;
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || width < 768;

  let tier, dprCap, shadowEnabled, particleMult, coralMult, waterSegments, bloomStrength;

  if (isMobile || dpr < 1.5 || width < 768 || cores <= 4) {
    tier = 'low';
    dprCap = 1;
    shadowEnabled = false;
    particleMult = 0.3;
    coralMult = 0.3;
    waterSegments = 40;
    bloomStrength = 0;
  } else if (dpr >= 2 && width >= 1440 && cores >= 6 && !isMobile) {
    tier = 'high';
    dprCap = 2;
    shadowEnabled = true;
    particleMult = 1.0;
    coralMult = 1.0;
    waterSegments = 96;
    bloomStrength = 0.25;
  } else {
    tier = 'medium';
    dprCap = 1.5;
    shadowEnabled = true;
    particleMult = 0.6;
    coralMult = 0.5;
    waterSegments = 60;
    bloomStrength = 0.15;
  }

  const quality = { tier, dprCap, shadowEnabled, particleMult, coralMult, waterSegments, bloomStrength };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(quality));
  return quality;
}

export const quality = detectQuality();
