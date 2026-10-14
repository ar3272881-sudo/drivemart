(() => {
  const form = document.getElementById('sellerCarForm');
  const detailForm = document.getElementById('detailEstimateForm');
  async function parseResponse(response) {
    let result;
    try { result = await response.json(); } catch { throw new Error('Unexpected server response.'); }
    if (!response.ok || !result.ok) throw new Error(result.error || 'Request failed.');
    return result;
  }
  if (form) {
    const csrf = form.querySelector('[name="csrf_token"]').value;
    const scan = document.getElementById('scanVehicle');
    const feedback = document.getElementById('scanResult');
    scan.addEventListener('click', async () => {
      const image = form.querySelector('[name="image"]').files[0];
      if (!image) { feedback.textContent = 'Please select a car image first.'; return; }
      if (image.size > 5 * 1024 * 1024) { feedback.textContent = 'Maximum image size is 5MB.'; return; }
      const data = new FormData(); data.append('csrf_token', csrf); data.append('image', image);
      scan.disabled = true; feedback.textContent = 'Scanning your image with Gemini…';
      try {
        const result = await parseResponse(await fetch('/api/ai/scan', { method: 'POST', body: data }));
        for (const key of ['brand','model','color','year']) {
          if (result.car[key] !== null && result.car[key] !== undefined && result.car[key] !== '') form.elements[key].value = result.car[key];
        }
        feedback.textContent = `Scan done (${result.car.confidence} confidence). ${result.note}`;
      } catch (e) { feedback.textContent = e.message; }
      finally { scan.disabled = false; }
    });
  }
  async function estimate(estimateForm, button, feedback) {
    const fields = ['brand','model','year','mileage','condition'];
    const source = Object.fromEntries(fields.map(key => [key, estimateForm.elements[key]?.value || '']));
    source.csrf_token = estimateForm.elements.csrf_token.value;
    button.disabled = true; feedback.textContent = 'Estimating indicative Pakistani market value…';
    try {
      const result = await parseResponse(await fetch('/api/ai/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(source) }));
      const val = result.valuation;
      const fmt = n => new Intl.NumberFormat('en-PK').format(n);
      feedback.textContent = `Approx. PKR ${fmt(val.estimatePKR)} (range ${fmt(val.lowPKR)}–${fmt(val.highPKR)}). ${val.reason} ${val.disclaimer}`;
    } catch (e) { feedback.textContent = e.message; }
    finally { button.disabled = false; }
  }
  if (form) document.getElementById('estimateVehicle').addEventListener('click', () => estimate(form, document.getElementById('estimateVehicle'), document.getElementById('estimateResult')));
  if (detailForm) document.getElementById('detailEstimate').addEventListener('click', () => estimate(detailForm, document.getElementById('detailEstimate'), document.getElementById('detailEstimateResult')));
})();
