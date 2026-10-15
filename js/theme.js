// Apply the saved preference before CSS and page content can paint.
(() => {
  const read = () => {
    const cookie = document.cookie.match(/(?:^|; )olmaxTheme=(dark|light)(?:;|$)/)?.[1];
    if (cookie) return cookie;
    try { return localStorage.getItem('olmaxTheme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  };
  const apply = (value) => {
    const theme = value === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    return theme;
  };
  const save = (value) => {
    const theme = apply(value);
    try { localStorage.setItem('olmaxTheme', theme); } catch {}
    const domain = /(^|\.)olmax\.net\.pl$/.test(location.hostname) ? '; Domain=olmax.net.pl' : '';
    document.cookie = `olmaxTheme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${location.protocol === 'https:' ? '; Secure' : ''}`;
    return theme;
  };
  window.olmaxTheme = {read, apply, save};
  save(read());
  window.addEventListener('pageshow', () => {
    apply(read());
    document.dispatchEvent(new Event('themechange'));
  });
  window.addEventListener('storage', (event) => {
    if (event.key === 'olmaxTheme') {
      save(event.newValue);
      document.dispatchEvent(new Event('themechange'));
    }
  });
})();
