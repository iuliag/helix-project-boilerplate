// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './lib-franklin.js';
import { analyticsSetConsent } from './lib-analytics.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

// add more delayed functionality here

// Custom logic can be inserted here in order to set consent based on
// the consent cookies or CMP events
function getCookie(name) {
  const cookieArr = document.cookie.split(';');
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < cookieArr.length; i++) {
    const cookiePair = cookieArr[i].split('=');
    if (name === cookiePair[0].trim()) {
      return decodeURIComponent(cookiePair[1]);
    }
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function isAdvertisingCookieAllowed() {
  const noticeGDPRPrefs = getCookie('notice_gdpr_prefs');
  const noticeBehavior = getCookie('notice_behavior');

  if (!noticeGDPRPrefs && noticeBehavior && noticeBehavior !== 'expressed|eu') {
    return true;
  }
  if (noticeGDPRPrefs) {
    return /^.*2.*$/i.test(noticeGDPRPrefs);
  }
  return false;
}

await analyticsSetConsent(true);
