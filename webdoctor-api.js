(() => {
  const originalStartScan = window.startScan;

  window.startScan = async function startScan() {
    if (typeof originalStartScan === 'function') originalStartScan();

    const state = document.getElementById('scan-state');
    const log = document.querySelector('#scan .log');
    const setState = (value) => { if (state) state.textContent = value; };
    const addLog = (message, tone = '') => {
      if (!log) return;
      const row = document.createElement('div');
      row.innerHTML = `<span>${new Date().toLocaleTimeString()}</span> ${message}`;
      if (tone === 'error') row.style.color = '#ef4444';
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    };

    setState('SCANNING');
    addLog('Secure scan request sent to WebDoctor backend');

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'authorized full-stack application: my-application / production'
        })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The scan request failed');

      setState('VERIFIED');
      addLog('Kopai agent completed the investigation');
      if (payload.text) addLog(payload.text.slice(0, 240).replace(/</g, '&lt;'));
    } catch (error) {
      setState('CONFIGURE');
      addLog(error.message, 'error');
    }
  };
})();
