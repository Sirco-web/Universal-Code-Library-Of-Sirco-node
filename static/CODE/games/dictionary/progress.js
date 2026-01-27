// progress.js
function showProgress(total) {
  const container = document.getElementById('progressContainer');
  const bar = document.getElementById('progressBar');
  container.style.display = 'block';
  bar.style.width = '0%';
  bar.dataset.total = total;
  bar.dataset.done = 0;
}

function updateProgress() {
  const bar = document.getElementById('progressBar');
  let done = parseInt(bar.dataset.done, 10) || 0;
  const total = parseInt(bar.dataset.total, 10) || 1;
  done++;
  bar.dataset.done = done;
  const pct = Math.round((done / total) * 100);
  bar.style.width = pct + '%';
  if (done >= total) {
    setTimeout(() => {
      document.getElementById('progressContainer').style.display = 'none';
    }, 500);
  }
}
