// hazeEffect.js

function applyHaze(ctx, width, height) {
  const hazeCanvas = document.getElementById('Tcanvas');
  hazeCanvas.width = width;
  hazeCanvas.height = height;
 
  const hazeCtx = hazeCanvas.getContext('2d',{ willReadFrequently: true });

  const gradient = hazeCtx.createRadialGradient(
    width / 2, height / 2, width / 4,
    width / 2, height / 2, width / 1.2
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.05)');

  hazeCtx.fillStyle = gradient;
  hazeCtx.fillRect(0, 0, width, height);

  Tctx.globalAlpha = HAZE_OPACITY;
  Tctx.drawImage(hazeCanvas, 0, 0);
  Tctx.globalAlpha = 1.0;
}

function simulatePixelShift(ctx, width, height) {
  const imageData = Tctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const shift = Math.floor(Math.random() * (2 * PIXEL_SHIFT_RANGE + 1)) - PIXEL_SHIFT_RANGE;
    data[i] = data[i + shift] || data[i];
    data[i + 1] = data[i + 1 + shift] || data[i + 1];
    data[i + 2] = data[i + 2 + shift] || data[i + 2];
  }

  Tctx.putImageData(imageData, 0, 0);
}

function applyInvert(ctx, width, height) {
  const imageData = Tctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i];     // Red
    data[i + 1] = 255 - data[i + 1]; // Green
    data[i + 2] = 255 - data[i + 2]; // Blue
    // Alpha (data[i + 3]) stays the same
  }

  Tctx.putImageData(imageData, 0, 0);
}
function applyGrayscale(ctx, width, height) {
  const imageData = Tctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = data[i + 1] = data[i + 2] = avg;
  }

  Tctx.putImageData(imageData, 0, 0);
}

function applySepia(ctx, width, height) {
  const imageData = Tctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    data[i]     = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b); // Red
    data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b); // Green
    data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b); // Blue
  }

  Tctx.putImageData(imageData, 0, 0);
}

function applyBlur(ctx, width, height) {
  // Create a temporary Tcanvas
  const tempCanvas = document.getElementById('Tcanvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d',{ willReadFrequently: true });

  // Copy current image
  tempCtx.drawImage(Tcanvas, 0, 0);

  // Apply blur filter and redraw
  Tctx.clearRect(0, 0, width, height);
  Tctx.filter = 'blur(2px)';
  Tctx.drawImage(tempCanvas, 0, 0);
  Tctx.filter = 'none'; // Reset filter
}

function applyBrightnessContrast(ctx, width, height, brightness = 0, contrast = 0) {
  const imageData = Tctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const bFactor = brightness / 100;
  const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    // Brightness
    data[i]     += 255 * bFactor;
    data[i + 1] += 255 * bFactor;
    data[i + 2] += 255 * bFactor;

    // Contrast
    data[i]     = cFactor * (data[i] - 128) + 128;
    data[i + 1] = cFactor * (data[i + 1] - 128) + 128;
    data[i + 2] = cFactor * (data[i + 2] - 128) + 128;
  }

  Tctx.putImageData(imageData, 0, 0);
}
function applyGaussianBlur(ctx, width, height, radius = 3) {
  const tempCanvas = document.getElementById('Tcanvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d',{ willReadFrequently: true });

  tempCtx.drawImage(Tcanvas, 0, 0);

  Tctx.clearRect(0, 0, width, height);
  Tctx.filter = `blur(${radius}px)`;
  Tctx.drawImage(tempCanvas, 0, 0);
  Tctx.filter = 'none';
}

