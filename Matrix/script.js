function multiplyImages() {
  const img1Input = document.getElementById("img1");
  const img2Input = document.getElementById("img2");
  const canvas = document.getElementById("resultCanvas");
  const canvas2 = document.getElementById("canvas1");
  const canvas3 = document.getElementById("canvas2");
  const ctx = canvas.getContext("2d");
  const ctx3 = canvas2.getContext("2d");
  const ctx4 = canvas3.getContext("2d");

  if (!img1Input.files[0] || !img2Input.files[0]) {
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

  img1.src = URL.createObjectURL(img1Input.files[0]);
  img2.src = URL.createObjectURL(img2Input.files[0]);

  function processImages(image1, image2) {
    const tempCanvas1 = document.createElement("canvas");
    const tempCanvas2 = document.createElement("canvas");

    tempCanvas1.width = 300;
    tempCanvas1.height = 300;
    tempCanvas2.width = 300;
    tempCanvas2.height = 600;

    const ctx1 = tempCanvas1.getContext("2d");
    const ctx2 = tempCanvas2.getContext("2d");

    // Draw image1 at top of canvas
    ctx1.drawImage(image1, 0, 0, 300, 300);
    // Draw image2 full height
    ctx2.drawImage(image2, 0, 0, 300, 600);

    const imgData1 = ctx1.getImageData(0, 0, 300, 300);
    const imgData2 = ctx2.getImageData(0, 0, 300, 600);
    const result = ctx.createImageData(300, 600);

    for (let y = 0; y < 600; y++) {
    for (let x = 0; x < 300; x++) {
      const i = (y * 300 + x) * 4;

      const pixel2 = imgData2.data[i]; // R channel from second image
      let pixel1 = 0;

      if (y < 300) {
        const i1 = (y * 300 + x) * 4;
        pixel1 = imgData1.data[i1];
      }

      const multiplied = (pixel1 / 255) * (pixel2 / 255) * 255;
      result.data[i] = result.data[i + 1] = result.data[i + 2] = multiplied;
      result.data[i + 3] = 255;
    }
  }

    ctx3.putImageData(imgData1, 0, 0);
    ctx.putImageData(result, 0, 0);
    ctx4.putImageData(imgData2, 0, 0);
  }
}