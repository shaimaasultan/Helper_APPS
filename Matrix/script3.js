function resizeImageDataPreserveAspect(srcImage, targetW, targetH, callback) {
  const srcW = srcImage.width;
  const srcH = srcImage.height;

  const scale = Math.min(targetW / srcW, targetH / srcH);
  const scaledW = Math.round(srcW * scale);
  const scaledH = Math.round(srcH * scale);
  const offsetX = Math.floor((targetW - scaledW) / 2);
  const offsetY = Math.floor((targetH - scaledH) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(srcImage, offsetX, offsetY, scaledW, scaledH);

  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  callback(imageData.data);
}

function sobelEdgeMap(imageData, width, height) {
  const grayscale = new Float32Array(width * height);
  const output = new Uint8ClampedArray(width * height * 4);

  // Convert to grayscale
  for (let i = 0; i < width * height; i++) {
    const r = imageData[i * 4];
    const g = imageData[i * 4 + 1];
    const b = imageData[i * 4 + 2];
    grayscale[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  let maxMagnitude = 0;
  const magnitudes = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = grayscale[(y + ky) * width + (x + kx)];
          const idx = (ky + 1) * 3 + (kx + 1);
          gx += pixel * sobelX[idx];
          gy += pixel * sobelY[idx];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      magnitudes[y * width + x] = magnitude;
      if (magnitude > maxMagnitude) maxMagnitude = magnitude;
    }
  }

  // Normalize and write to output
  for (let i = 0; i < width * height; i++) {
    const val = (magnitudes[i] / maxMagnitude) * 255;
    output[i * 4] = output[i * 4 + 1] = output[i * 4 + 2] = val;
    output[i * 4 + 3] = 255;
  }

  return new ImageData(output, width, height);
}

function multiplyImages() {
  const img1File = document.getElementById("img1").files[0];
  const img2File = document.getElementById("img2").files[0];
  ctx3 = document.getElementById("canvas1");
  ctx4 = document.getElementById("canvas2");
  

  if (!img2File|| !img1File) {
    alert("Please upload both images.");
    return;
  }

  const img1 = new Image();
  const img2 = new Image();

  let loaded = 0;
  const checkLoaded = () => {
    loaded++;
    if (loaded === 2) {
      processImages(img1, img2);
    }
  };

  img1.onload = checkLoaded;
  img2.onload = checkLoaded;

  img1.src = URL.createObjectURL(img1File);
  img2.src = URL.createObjectURL(img2File);

  function processImages(img1, img2) {
  const newW = 300;
  const newH = 300;

  const resultCanvas = document.getElementById("resultCanvas");
  resultCanvas.width = newW;
  resultCanvas.height = newH;
  const resultCtx = resultCanvas.getContext("2d");

  resizeImageDataPreserveAspect(img1, newW, newH, (data1) => {
    resizeImageDataPreserveAspect(img2, newW, newH, (data2) => {
      const result = resultCtx.createImageData(newW, newH);

      for (let i = 0; i < data1.length; i += 4) {
        const val = (data1[i] / 255) * (data2[i] / 255) * 255;
        result.data[i] = val;
        result.data[i + 1] = val;
        result.data[i + 2] = val;
        result.data[i + 3] = 255;
      }

      resultCtx.putImageData(result, 0, 0);
      

    

      // Draw originals with preserved aspect
      const ctx3 = document.getElementById("canvas1");
      const ctx4 = document.getElementById("canvas2");
      ctx3.width = newW;
      ctx3.height = newH; 
      ctx4.width = newW;
      ctx4.height = newH;
      const Octx3 = ctx3.getContext("2d");
      const Octx4 = ctx4.getContext("2d");
      resizeImageDataPreserveAspect(img1, newW, newH, (data) => {
        Octx3.putImageData(new ImageData(data, newW, newH), 0, 0);
      });
      resizeImageDataPreserveAspect(img2, newW, newH, (data) => {
        Octx4.putImageData(new ImageData(data, newW, newH), 0, 0);
      });

      // Edge map of second image
      const edgeMap = sobelEdgeMap(result.data, newW, newH);
      const edgeCanvas = document.getElementById("edgeCanvas");
      edgeCanvas.width = newW;
      edgeCanvas.height = newH;
      const edgeCtx = edgeCanvas.getContext("2d");
      edgeCtx.putImageData(edgeMap, 0, 0);
    });
  });
}


}