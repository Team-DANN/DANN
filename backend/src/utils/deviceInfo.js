// Turns a User-Agent string into something a person can read, like
// "Chrome on Windows". Order matters: Edge and Opera also say "Chrome",
// iPhones also say "Mac OS X", and Android also says "Linux".
function describeDevice(userAgent) {
  const ua = String(userAgent || '');
  if (!ua) return 'an unknown device';

  const browser = /edg\//i.test(ua) ? 'Edge'
    : /opr\/|opera/i.test(ua) ? 'Opera'
    : /firefox|fxios/i.test(ua) ? 'Firefox'
    : /chrome|crios/i.test(ua) ? 'Chrome'
    : /safari/i.test(ua) ? 'Safari'
    : null;

  const os = /android/i.test(ua) ? 'Android'
    : /iphone|ipad|ipod/i.test(ua) ? 'iOS'
    : /windows/i.test(ua) ? 'Windows'
    : /mac os x|macintosh/i.test(ua) ? 'macOS'
    : /linux|x11/i.test(ua) ? 'Linux'
    : null;

  if (browser && os) return `${browser} on ${os}`;
  return browser || os || 'an unknown device';
}

function cleanIp(ip) {
  return String(ip || '').replace(/^::ffff:/, '');
}

module.exports = { describeDevice, cleanIp };