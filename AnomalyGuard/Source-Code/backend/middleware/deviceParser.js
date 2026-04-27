/**
 * Parses User-Agent and IP to populate req.deviceInfo
 * Attach BEFORE AuthController so login events get telemetry
 */
const extractDeviceInfo = (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
           || req.socket?.remoteAddress
           || '127.0.0.1';
  const browser  = detectBrowser(ua);
  const os       = detectOS(ua);
  const deviceType = detectDeviceType(ua);
  req.deviceInfo = { ipAddress: ip, userAgent: ua, browser, os, deviceType };
  next();
};
function detectBrowser(ua) {
  if (/Edg\//i.test(ua))     return 'Edge';
  if (/OPR\//i.test(ua))     return 'Opera';
  if (/Chrome\//i.test(ua))  return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua))  return 'Safari';
  if (/MSIE|Trident/i.test(ua)) return 'IE';
  return 'Unknown';
}
function detectOS(ua) {
  if (/Windows NT 10/i.test(ua))  return 'Windows 10/11';
  if (/Windows/i.test(ua))        return 'Windows';
  if (/Mac OS X/i.test(ua))       return 'macOS';
  if (/Android/i.test(ua))        return 'Android';
  if (/iPhone|iPad/i.test(ua))    return 'iOS';
  if (/Linux/i.test(ua))          return 'Linux';
  return 'Unknown';
}
function detectDeviceType(ua) {
  if (/Tablet|iPad/i.test(ua))    return 'tablet';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}
module.exports = { extractDeviceInfo };
