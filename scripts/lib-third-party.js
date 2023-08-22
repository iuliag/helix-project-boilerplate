// eslint-disable-next-line no-unused-vars
function createExternalScript(scriptUrl, parent) {
  const script = document.createElement('script');
  script.type = 'text/partytown';
  script.src = scriptUrl;
  parent.appendChild(script);
}

function createInlineScript(innerHTML, parent) {
  const script = document.createElement('script');
  script.type = 'text/partytown';
  script.innerHTML = innerHTML;
  parent.appendChild(script);
}

export function integrateMartech() {
  // TODO: here go the martech scripts/link to them
  createInlineScript('console.debug("inline script");', document.body);
  // createExternalScript('<SCRIPT_URL>', document.body);
}

export function initPartytown() {
  window.partytown = {
    lib: '/scripts/',
    forward: ['adobeDataLayer.push', 'dataLayer.push', 'gtaginit', 'gtag'],
  };
  import('./partytown/partytown.js');
}
