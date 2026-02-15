import { isInAppBrowser } from './browser';
import { describe, it, expect } from 'vitest';

describe('isInAppBrowser', () => {
  it('detects Facebook in-app browser', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone11,8;FBMD/iPhone;FBSN/iOS;FBSV/13.3.1;FBSS/2;FBID/phone;FBLC/en_US;FBOP/5;FBCR/]')).toBe(true);
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/353.0.0.34.116;]')).toBe(true);
  });

  it('detects Instagram in-app browser', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 14_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 123.0.0.21.115 (iPhone11,8; iOS 14_1; en_US; en-US; scale=2.00; 828x1792; 261730075)')).toBe(true);
  });

  it('detects Android WebView', () => {
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36')).toBe(true);
  });

  it('returns false for standard Chrome on Android', () => {
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Mobile Safari/537.36')).toBe(false);
  });

  it('returns false for standard Safari on iOS', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1')).toBe(false);
  });
});
