export const STORE_URL = 'https://apps.apple.com/app/id6798365274';
export function invitation(search) {
  const code = (new URLSearchParams(search).get('code') || '').toUpperCase().replaceAll('-', '').trim();
  if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(code)) return null;
  return {code, appURL: `orbitshift://add?code=${code}`};
}
if (typeof document !== 'undefined') {
  const invite = invitation(location.search);
  const label = document.getElementById('invite-code');
  const status = document.getElementById('invite-status');
  const open = document.getElementById('open-invite');
  label.textContent = invite ? `Friend code: ${invite.code.slice(0,4)}-${invite.code.slice(4)}` : 'This invitation has no valid code. Ask your friend to share it again.';
  if (invite) {
    open.hidden = false;
    open.href = invite.appURL;
    let fallback;
    const storeFallback = () => {
      clearTimeout(fallback);
      fallback = setTimeout(() => {
        if (document.visibilityState === 'visible') location.replace(STORE_URL);
      }, 1500);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') clearTimeout(fallback);
    });
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) {
      // Installed apps handle the HTTPS link before this page is loaded.
      status.textContent = 'Opening the App Store… After installing, tap your invitation again.';
      storeFallback();
      open.addEventListener('click', storeFallback);
    }
  }
}
