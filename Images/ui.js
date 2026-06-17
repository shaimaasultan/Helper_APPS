// ui.js




let originalImage = null;


function attachSliderValue(sliderId, valueId) {
  const slider = document.getElementById(sliderId);
  const valueDisplay = document.getElementById(valueId);

  valueDisplay.textContent = slider.value;

  slider.addEventListener('input', () => {
    valueDisplay.textContent = slider.value;
  });
}

// Attach all sliders
attachSliderValue('brightnessSlider', 'brightnessValue');
attachSliderValue('contrastSlider', 'contrastValue');
attachSliderValue('hazeSlider', 'OpacityValue');
attachSliderValue('shiftSlider', 'noiseValue');
attachSliderValue('gaussSlider', 'blurValue');
attachSliderValue('diffThreshold', 'ThresholdValue');
// Add more as needed
// Update global config from sliders
hazeSlider.addEventListener('input', () => {
  window.HAZE_OPACITY = parseFloat(hazeSlider.value);
});

shiftSlider.addEventListener('input', () => {
  window.PIXEL_SHIFT_RANGE = parseInt(shiftSlider.value);
});
// Canvas and context assumed to be globally available
// imageUpload, canvas, Tctx, spinner from globals.js



// 📸 Load image and show thumbnai
imageUpload.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    originalImage = new Image();
    originalImage.onload = function() {
      thumbnailCanvas.width = originalImage.width;
      thumbnailCanvas.height = originalImage.height;
      thumbnailCtx.clearRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
      thumbnailCtx.drawImage(originalImage, 0, 0);
    };
    originalImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
});


function reconstructOriginalImage(transformedCtx, diffCtx, width, height, transformationStack) {
  reconstructedCanvas.width = width;
  reconstructedCanvas.height = height;

  const transformedData = transformedCtx.getImageData(0, 0, width, height).data;
  const diffData = diffCtx.getImageData(0, 0, width, height).data;
  const reconstructedImage = reconstructedCtx.createImageData(width, height);
  const outputData = reconstructedImage.data;

  for (let i = 0; i < transformedData.length; i += 4) {
    outputData[i]     = Math.max(0, Math.min(255, transformedData[i]     - diffData[i]));     // R
    outputData[i + 1] = Math.max(0, Math.min(255, transformedData[i + 1] - diffData[i + 1])); // G
    outputData[i + 2] = Math.max(0, Math.min(255, transformedData[i + 2] - diffData[i + 2])); // B
    outputData[i + 3] = 255; // Alpha
  }

  reconstructedCtx.putImageData(reconstructedImage, 0, 0);

  // Optionally apply inverse transformations in reverse order
  for (let i = transformationStack.length - 1; i >= 0; i--) {
    const transform = transformationStack[i];
    applyInverseTransform(reconstructedCtx, width, height, transform);
  }
}

function getTransformationStackFromUI() {
  const stack = [];

  const selected = Array.from(document.querySelectorAll('.transform-option'))
    .filter(opt => opt.checked)
    .map(opt => opt.value);

  if (selected.includes('Brightness')) {
    stack.push({ name: 'Brightness', value: parseInt(brightnessSlider.value) });
  }

  if (selected.includes('Contrast')) {
    stack.push({ name: 'Contrast', value: parseInt(contrastSlider.value) });
  }

  if (selected.includes('PixelShift')) {
    stack.push({ name: 'PixelShift', range: parseInt(shiftSlider.value) });
  }

  if (selected.includes('GaussianBlur')) {
    stack.push({ name: 'GaussianBlur', radius: parseFloat(gaussSlider.value) });
  }

  if (selected.includes('Haze')) {
    stack.push({ name: 'Haze', opacity: parseFloat(hazeSlider.value) });
  }

  // Add other transformations as needed
  if (selected.includes('Invert')) stack.push({ name: 'Invert' });
  if (selected.includes('Grayscale')) stack.push({ name: 'Grayscale' });
  if (selected.includes('Sepia')) stack.push({ name: 'Sepia' });
  if (selected.includes('Blur')) stack.push({ name: 'Blur' });

  return stack;
}

function applyInverseTransform(Tctx, width, height, transform) {
  switch (transform.name) {
    case 'Brightness':
      applyBrightness(Tctx, width, height, -transform.value);
      break;
    case 'Contrast':
      applyContrast(Tctx, width, height, -transform.value);
      break;
    case 'PixelShift':
      reversePixelShift(Tctx, width, height, transform.range);
      break;
    case 'GaussianBlur':
      sharpenImage(Tctx, width, height); // Approximate inverse
      break;
    case 'Invert':
      applyInvert(Tctx, width, height); // Invert is its own inverse
      break;
    case 'Grayscale':
      // Not reversible — skip or apply color hallucination
      break;
    case 'Sepia':
      // Not reversible — skip or approximate
      break;
    case 'Blur':
      sharpenImage(Tctx, width, height); // Approximate inverse
      break;
    case 'Haze':
      // You could reduce opacity or apply contrast boost
      break;
  }
}

function isColorMatch(r, g, b, targetR, targetG, targetB, tolerance = 10) {
  return (
    Math.abs(r - targetR) <= tolerance &&
    Math.abs(g - targetG) <= tolerance &&
    Math.abs(b - targetB) <= tolerance
  );
}

function segmentConfidenceRegions(originalCtx, heatmapCtx, width, height) {
  const originalData = originalCtx.getImageData(0, 0, width, height).data;
  const heatmapData = heatmapCtx.getImageData(0, 0, width, height).data;

  const lowCanvas = document.getElementById('lowConfidenceCanvas');
  const mediumCanvas = document.getElementById('mediumConfidenceCanvas'); // Optional
  const highCanvas = document.getElementById('highConfidenceCanvas');
  const unchangedCanvas = document.getElementById('unchangedCanvas');

  const lowCtx = lowCanvas.getContext('2d',{ willReadFrequently: true });
  const mediumCtx = mediumCanvas.getContext('2d',{ willReadFrequently: true });
  const highCtx = highCanvas.getContext('2d',{ willReadFrequently: true });
  const unchangedCtx = unchangedCanvas.getContext('2d',{ willReadFrequently: true });

  lowCanvas.width = mediumCanvas.width = highCanvas.width = unchangedCanvas.width = width;
  lowCanvas.height = mediumCanvas.height = highCanvas.height = unchangedCanvas.height = height;

  const lowImage = lowCtx.createImageData(width, height);
  const mediumImage = mediumCtx.createImageData(width, height);
  const highImage = highCtx.createImageData(width, height);
  const unchangedImage = unchangedCtx.createImageData(width, height);

  for (let i = 0; i < heatmapData.length; i += 4) {
    const r = heatmapData[i];
    const g = heatmapData[i + 1];
    const b = heatmapData[i + 2];

    const origR = originalData[i];
    const origG = originalData[i + 1];
    const origB = originalData[i + 2];
    const origA = originalData[i + 3];

    // High confidence: green (0, 255, 0)
    const isGreen  = isColorMatch(r, g, b, 0, 255, 0);
    // Medium confidence: yellow (255, 255, 0)
    const isYellow = isColorMatch(r, g, b, 255, 255, 0);
    // Low confidence: red (255, 0, 0)
    const isRed    = isColorMatch(r, g, b, 255, 0, 0);
    // Unchanged: black (0, 0, 0)
    const isBlack  = isColorMatch(r, g, b, 0, 0, 0);

    if (isGreen) {
      //console.info("isGreen")
      highImage.data[i]     = origR;
      highImage.data[i + 1] = origG;
      highImage.data[i + 2] = origB;
      highImage.data[i + 3] = origA;
    } else if (isYellow) {
      //console.info("isYellow")
      mediumImage.data[i]     = origR;
      mediumImage.data[i + 1] = origG;
      mediumImage.data[i + 2] = origB;
      mediumImage.data[i + 3] = origA;
    } else if (isRed) {
      lowImage.data[i]     = origR;
      lowImage.data[i + 1] = origG;
      lowImage.data[i + 2] = origB;
      lowImage.data[i + 3] = origA;
    } else if (isBlack) {
      unchangedImage.data[i]     = origR;
      unchangedImage.data[i + 1] = origG;
      unchangedImage.data[i + 2] = origB;
      unchangedImage.data[i + 3] = origA;
    }
  }

  lowCtx.putImageData(lowImage, 0, 0);
  mediumCtx.putImageData(mediumImage, 0, 0);
  highCtx.putImageData(highImage, 0, 0);
  unchangedCtx.putImageData(unchangedImage, 0, 0);
}



// 🎨 Apply selected transformations to canvas
applyBtn.addEventListener('click', () => {
  if (!originalImage) return;

  const brightness = parseInt(brightnessSlider.value);
  const contrast = parseInt(contrastSlider.value);
  const gaussRadius = parseFloat(gaussSlider.value);


  showSpinner();

  Tcanvas.width = originalImage.width;
  Tcanvas.height = originalImage.height;
  Tctx.drawImage(originalImage, 0, 0);

  const selected = Array.from(transformOptions)
    .filter(opt => opt.checked)
    .map(opt => opt.value);

  if (selected.includes('Haze')) applyHaze(Tctx, Tcanvas.width, Tcanvas.height);
  if (selected.includes('PixelShift')) simulatePixelShift(Tctx, Tcanvas.width, Tcanvas.height);
  if (selected.includes('Invert')) applyInvert(Tctx, Tcanvas.width, Tcanvas.height);
  if (selected.includes('Grayscale')) applyGrayscale(Tctx, Tcanvas.width, Tcanvas.height);
  if (selected.includes('Sepia')) applySepia(Tctx, Tcanvas.width, Tcanvas.height);
  if (selected.includes('Blur')) applyBlur(Tctx, Tcanvas.width, Tcanvas.height);
  if (selected.includes('brightness')) applyBrightnessContrast(Tctx, Tcanvas.width, Tcanvas.height, brightness, contrast);
  if (selected.includes('GaussianBlur')) applyGaussianBlur(Tctx, Tcanvas.width, Tcanvas.height, gaussRadius);

  computePixelDiff(Tctx);
  computePixelDiffthreshold(Tctx);
  const transformationStack = getTransformationStackFromUI();
  reconstructOriginalImage(Tctx, diffCtx, Tcanvas.width, Tcanvas.height, transformationStack);
  generateConfidenceHeatmap(diffCtx, Tcanvas.width, Tcanvas.height);
  segmentConfidenceRegions(thumbnailCtx, heatmapCtx, Tcanvas.width, Tcanvas.height);
  hideSpinner();
});

// 🔄 Reset canvas and UI
resetBtn.addEventListener('click', () => {
  Tctx.clearRect(0, 0, Tcanvas.width, Tcanvas.height);
  Tcanvas.width = 0;
  Tcanvas.height = 0;
  imageUpload.value = '';
  thumbnail.src = '';
  thumbnail.classList.add('hidden');
  selectedLabel.textContent = 'Selected: None';
  transformOptions.forEach(opt => opt.checked = false);
});

function reversePixelShift(Tctx, width, height, range) {
  const imageData = Tctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const destX = x - range;

      if (destX >= 0) {
        const destIndex = (y * width + destX) * 4;
        newData[destIndex]     = data[srcIndex];     // R
        newData[destIndex + 1] = data[srcIndex + 1]; // G
        newData[destIndex + 2] = data[srcIndex + 2]; // B
        newData[destIndex + 3] = data[srcIndex + 3]; // A
      }
    }
  }

  const reversedImage = new ImageData(newData, width, height);
  Tctx.putImageData(reversedImage, 0, 0);
}

function generateConfidenceHeatmap(diffCtx, width, height, threshold = 50) {
  const diffData = diffCtx.getImageData(0, 0, width, height).data;
  const thumbnailData = thumbnailCtx.getImageData(0, 0, width, height).data;
  const heatmapImage = heatmapCtx.createImageData(width, height);
  const heatmapData = heatmapImage.data;
  for (let i = 0; i < diffData.length; i += 4) {
    const r = diffData[i];
    const g = diffData[i + 1];
    const b = diffData[i + 2];

    const ro = thumbnailData[i];
    const go = thumbnailData[i + 1];
    const bo = thumbnailData[i + 2];

    const totalDiff = (r-ro) + (g-go) + (b-bo);
    if (totalDiff === 0) {
      // Unchanged: black (0, 0, 0)
      heatmapData[i]     = 0;
      heatmapData[i + 1] = 0;
      heatmapData[i + 2] = 0;
      heatmapData[i + 3] = 255;
    } else if (totalDiff < threshold) {
      // High confidence: green (0, 255, 0)
      heatmapData[i]     = 0;
      heatmapData[i + 1] = 255;
      heatmapData[i + 2] = 0;
      heatmapData[i + 3] = 255;
    } else if (totalDiff < threshold * 2) {
      // Medium confidence: yellow (255, 255, 0)
      heatmapData[i]     = 255;
      heatmapData[i + 1] = 255;
      heatmapData[i + 2] = 0;
      heatmapData[i + 3] = 255;
    } else {
      // Low confidence: red (255, 0, 0)
      heatmapData[i]     = 255;
      heatmapData[i + 1] = 0;
      heatmapData[i + 2] = 0;
      heatmapData[i + 3] = 255;
    }

  }
   heatmapCanvas.width = width;
   heatmapCanvas.height = height;
   heatmapCtx.putImageData(heatmapImage, 0, 0);
}
// function generateConfidenceHeatmap(diffCtx, width, height, threshold = 50) {
//   const diffData = diffCtx.getImageData(0, 0, width, height).data;
//   const heatmapImage = heatmapCtx.createImageData(width, height);
//   const heatmapData = heatmapImage.data;

//   for (let i = 0; i < diffData.length; i += 4) {
//     const r = diffData[i];
//     const g = diffData[i + 1];
//     const b = diffData[i + 2];
//     const totalDiff = r + g + b;

//     if (totalDiff === 0) {
//       // Unchanged: black (0, 0, 0)
//       heatmapData[i]     = 0;
//       heatmapData[i + 1] = 0;
//       heatmapData[i + 2] = 0;
//       heatmapData[i + 3] = 255;
//     } else if (totalDiff < threshold) {
//       // High confidence: green (0, 255, 0)
//       heatmapData[i]     = 0;
//       heatmapData[i + 1] = 255;
//       heatmapData[i + 2] = 0;
//       heatmapData[i + 3] = 255;
//     } else if (totalDiff < threshold * 2) {
//       // Medium confidence: yellow (255, 255, 0)
//       heatmapData[i]     = 255;
//       heatmapData[i + 1] = 255;
//       heatmapData[i + 2] = 0;
//       heatmapData[i + 3] = 255;
//     } else {
//       // Low confidence: red (255, 0, 0)
//       heatmapData[i]     = 255;
//       heatmapData[i + 1] = 0;
//       heatmapData[i + 2] = 0;
//       heatmapData[i + 3] = 255;
//     }
//   }

//   heatmapCanvas.width = width;
//   heatmapCanvas.height = height;
//   heatmapCtx.putImageData(heatmapImage, 0, 0);
// }



function computePixelDiff(Tctx) {
  if (!originalImage) return;

  const width = Tcanvas.width;
  const height = Tcanvas.height;

  diffCanvas.width = width;
  diffCanvas.height = height;

  const originalData = thumbnailCtx.getImageData(0, 0, width, height).data;
  const transformedData = Tctx.getImageData(0, 0, width, height).data;
  const diffImage = diffCtx.createImageData(width, height);
  const diffData = diffImage.data;

  for (let i = 0; i < originalData.length; i += 4) {
    const rDiff = Math.abs(originalData[i] - transformedData[i]);
    const gDiff = Math.abs(originalData[i + 1] - transformedData[i + 1]);
    const bDiff = Math.abs(originalData[i + 2] - transformedData[i + 2]);

    diffData[i]     = rDiff;
    diffData[i + 1] = gDiff;
    diffData[i + 2] = bDiff;
    diffData[i + 3] = 255; // Fully opaque
  }

  diffCtx.putImageData(diffImage, 0, 0);
}

function sharpenImage(Tctx, width, height) {
  const imageData = Tctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const output = new Uint8ClampedArray(data.length);

  const kernel = [
    [ 0, -1,  0],
    [-1,  5, -1],
    [ 0, -1,  0]
  ];

  const kernelSize = 3;
  const half = Math.floor(kernelSize / 2);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = x + kx;
          const py = y + ky;
          const idx = (py * width + px) * 4;
          const weight = kernel[ky + half][kx + half];

          r += data[idx]     * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
        }
      }

      const i = (y * width + x) * 4;
      output[i]     = Math.min(255, Math.max(0, r));
      output[i + 1] = Math.min(255, Math.max(0, g));
      output[i + 2] = Math.min(255, Math.max(0, b));
      output[i + 3] = data[i + 3]; // Preserve alpha
    }
  }

  const sharpened = new ImageData(output, width, height);
  Tctx.putImageData(sharpened, 0, 0);
}



function computePixelDiffthreshold(Tctx){

  if (!originalImage) return;

  const width = Tcanvas.width;
  const height = Tcanvas.height;

  diffCanvasthreshold.width = width;
  diffCanvasthreshold.height = height;

  const originalData = thumbnailCtx.getImageData(0, 0, width, height).data;
  
  const transformedData = Tctx.getImageData(0, 0, width, height).data;
  const diffImage = diffCtxthreshold.createImageData(width, height);
  const diffData = diffImage.data;
  for (let i = 0; i < originalData.length; i += 4) {
    const rDiff = Math.abs(originalData[i] - transformedData[i]);
    const gDiff = Math.abs(originalData[i + 1] - transformedData[i + 1]);
    const bDiff = Math.abs(originalData[i + 2] - transformedData[i + 2]);

    const totalDiff = rDiff + gDiff + bDiff;

    if (totalDiff > threshold) {
      diffData[i]     = 255; // White pixel
      diffData[i + 1] = 255;
      diffData[i + 2] = 255;
      diffData[i + 3] = 255;
    } else {
      diffData[i]     = 0;   // Black pixel
      diffData[i + 1] = 0;
      diffData[i + 2] = 0;
      diffData[i + 3] = 255;
    }

  }
  diffCtxthreshold.putImageData(diffImage, 0, 0);
}



// 💾 Save transformed image
saveBtn.addEventListener('click', () => {
  // Get selected transformations
  const selected = Array.from(document.querySelectorAll('.transform-option'))
    .filter(opt => opt.checked)
    .map(opt => opt.value);

  const transformString = selected.length ? selected.join('_') : 'Original';

  // Get timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Create filename
  const filename = `${transformString}_${timestamp}.png`;

  // Save image
  const link = document.createElement('a');
  link.download = filename;
  link.href = Tcanvas.toDataURL('image/png');
  link.click();


});

// 🧠 Track selected transformations
transformOptions.forEach(option => {
  option.addEventListener('change', updateSelectedTransforms);
});

function updateSelectedTransforms() {
  const selected = Array.from(transformOptions)
    .filter(opt => opt.checked)
    .map(opt => opt.value);

  selectedLabel.textContent = selected.length
    ? `Selected: ${selected.join(', ')}`
    : 'Selected: None';
}

// 🌀 Spinner controls
function showSpinner() {
  spinner.classList.remove('hidden');
}

function hideSpinner() {
  spinner.classList.add('hidden');
}