// KEY FINDING from the portal JS source:
// if (!l) return void P(g.I.t('Redirect URI is not set'));
// This means the portal shows 'Redirect URI is not set' when the redirectUri param is EMPTY
// 
// The error 'Permission denied - Redirect URI is not set' happens when:
// redirectUri param is empty or missing in the initial login URL
//
// In our current PR#3 code, getRedirectUri() returns:
// getApiBaseUrl() + '/api/oauth/mobile'
// 
// getApiBaseUrl() returns EXPO_PUBLIC_API_BASE_URL if set.
// On native (Expo Go), EXPO_PUBLIC_API_BASE_URL is baked into the bundle at build time.
// 
// The question is: what is EXPO_PUBLIC_API_BASE_URL set to when the user scans the QR code?
// It could be empty or pointing to a wrong URL if the env var wasn't set when the bundle was built.

console.log('The error means redirectUri is EMPTY in the login URL');
console.log('This happens when getApiBaseUrl() returns empty string on native');
console.log('EXPO_PUBLIC_API_BASE_URL must be set and correct for this to work');
console.log('');
console.log('On native (Expo Go), env vars are baked into the JS bundle at build time');
console.log('If EXPO_PUBLIC_API_BASE_URL was not set when the bundle was built, getApiBaseUrl() returns empty');
console.log('Then redirectUri = /api/oauth/mobile (relative URL, not absolute)');
console.log('Portal sees empty redirectUri -> shows Permission denied');
console.log('');
console.log('SOLUTION: Use the DEPLOYED domain (habittrack-eewwypnn.manus.space) as the redirectUri');
console.log('This is a stable URL that never changes, unlike the sandbox URL');
console.log('The deployed domain is always available and the portal can redirect to it');
console.log('');
console.log('APPROACH:');
console.log('1. Hardcode the deployed domain in the redirectUri for native');
console.log('2. state = base64(deployedDomain + /api/oauth/mobile) - SDK decodes this for token exchange');
console.log('3. Portal redirects to deployed domain with code + state');
console.log('4. Deployed server exchanges code, creates session, redirects to app deep link');
console.log('');
console.log('BUT: The sandbox API server URL changes every session!');
console.log('The deployed domain (manus.space) always points to the latest deployed version');
console.log('So we should use the deployed domain as the redirectUri for native');
