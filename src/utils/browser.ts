interface WindowWithOpera extends Window {
  opera?: string;
}

export const isInAppBrowser = (
  userAgent: string = navigator.userAgent ||
    navigator.vendor ||
    (window as WindowWithOpera).opera ||
    ''
): boolean => {
  const rules = [
    'WebView',
    'Android.*(wv)',
    'FBAN',
    'FBAV',
    'Instagram',
    'Line',
    'Twitter',
    'Snapchat',
    'LinkedIn',
    'Pinterest',
    'Slack',
    'WhatsApp'
  ];
  const regex = new RegExp(`(${rules.join('|')})`, 'ig');
  return regex.test(userAgent);
};
