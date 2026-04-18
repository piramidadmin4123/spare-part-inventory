import { PublicClientApplication, type Configuration } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID as string;
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID as string;

export const isMsalConfigured =
  !!clientId &&
  clientId !== 'your-azure-client-id' &&
  !!tenantId &&
  tenantId !== 'your-azure-tenant-id';

const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? '',
    authority: `https://login.microsoftonline.com/${tenantId ?? 'common'}`,
    redirectUri: `${window.location.origin}/login`,
    postLogoutRedirectUri: `${window.location.origin}/login`,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const msLoginRequest = {
  scopes: ['openid', 'profile', 'email'],
  prompt: 'login', // Force re-authentication every time (no cached session)
  claims: JSON.stringify({
    id_token: {
      acr: { essential: true, values: ['urn:microsoft:policies:mfa'] },
    },
  }),
};
