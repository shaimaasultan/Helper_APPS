function resizeImageData(srcData, srcW, srcH, newW, newH) {
  const dstData = new Uint8ClampedArray(newW * newH * 4); // RGBA per pixel

  for (let y = 0; y < newH; y++) {
    const srcY = (y / newH) * srcH;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const yLerp = srcY - y0;

    for (let x = 0; x < newW; x++) {
      const srcX = (x / newW) * srcW;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const xLerp = srcX - x0;

      for (let c = 0; c < 4; c++) { // RGBA channels
        const i00 = (y0 * srcW + x0) * 4 + c;
        const i01 = (y0 * srcW + x1) * 4 + c;
        const i10 = (y1 * srcW + x0) * 4 + c;
        const i11 = (y1 * srcW + x1) * 4 + c;

        const top = srcData[i00] * (1 - xLerp) + srcData[i01] * xLerp;
        const bottom = srcData[i10] * (1 - xLerp) + srcData[i11] * xLerp;
        dstData[(y * newW + x) * 4 + c] = top * (1 - yLerp) + bottom * yLerp;
      }
    }
  }

  return dstData;
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

  function processImages(img1, img2){
    const canvas1 = document.createElement("canvas");
    const canvas2 = document.createElement("canvas");

    canvas1.width = img1.width;
    canvas1.height = img1.height;
    canvas2.width = img2.width;
    canvas2.height = img2.height;
    ctx3.width = img1.width;
    ctx3.height = img1.height;
    ctx4.width = img2.width;
    ctx4.height = img2.height;

    console.log(img1.width, img1.height);
    console.log(img2.width, img2.height); 

    const ctx1 = canvas1.getContext("2d");
    const ctx2 = canvas2.getContext("2d");
    const ctx3_2d = ctx3.getContext("2d");
    const ctx4_2d = ctx4.getContext("2d");

    ctx1.drawImage(img1, 0, 0 , img1.width, img1.height);
    ctx2.drawImage(img2, 0, 0, img2.width, img2.height);

    const data1 = ctx1.getImageData(0, 0 , img1.width, img1.height).data;
    const data2 = ctx2.getImageData(0, 0, img2.width, img2.height).data;
   
    let W, H;
    const resultCanvas = document.getElementById("resultCanvas");
    const resultCtx = resultCanvas.getContext("2d");
    W = Math.max(img1.width, img2.width);
    H = Math.max(img1.height, img2.height);
    resultCanvas.width = W
    resultCanvas.height = H;  

    const result = resultCtx.createImageData(W, H);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const pixel2 = data2[i]; // R channel from second image
        let pixel1 = 0;

        if (y < W) {
          const i1 = (y * W + x) * 4;
          pixel1 = data1[i1];
        }

        const val = (pixel1 / 255) * (pixel2 / 255) * 255;
        result.data[i] = val;
        result.data[i + 1] = val;
        result.data[i + 2] = val;
        result.data[i + 3] = 255; // full alpha 
      }
    }

    resultCtx.putImageData(result, 0, 0);
    
    // Draw image1 at top of canvas
    ctx3_2d.drawImage(img1, 0, 0, img1.width, img1.height);
    // Draw image2 full height
    ctx4_2d.drawImage(img2, 0, 0, img2.width, img2.height);

  }
}