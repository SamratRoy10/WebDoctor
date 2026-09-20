// The UI uses the same server-side routes for every user-scoped request.
// The browser never receives the Kopai API key. See server.js for the proxy.
export const webdoctorApi = {
  login: (name) => fetch('/api/auth/demo-login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) }),
  connectGithub: () => fetch('/api/integrations', { method: 'POST', headers: {'Content-Type':'application/json'} }),
  integrationStatus: () => fetch('/api/integrations'),
  chat: (message) => fetch('/api/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message}) })
};
