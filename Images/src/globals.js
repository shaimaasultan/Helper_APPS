// globals.js

// Canvas and context
//window.canvas = document.getElementById('Tcanvas');
//window.ctx = canvas.getContext('2d');

// DOM elements
window.imageUpload = document.getElementById('imageUpload');
window.spinner = document.getElementById('spinner');

// Configuration constants
window.HAZE_OPACITY = 0.5;
window.PIXEL_SHIFT_RANGE = 1;

// DOM elements
const thumbnail = document.getElementById('thumbnail');
const applyBtn = document.getElementById('applyBtn');
const transformOptions = document.querySelectorAll('.transform-option');
const selectedLabel = document.getElementById('selectedTransforms');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');
// Slider elements
const brightnessSlider = document.getElementById('brightnessSlider');
const contrastSlider = document.getElementById('contrastSlider');
const hazeSlider = document.getElementById('hazeSlider');
const shiftSlider = document.getElementById('shiftSlider');
const gaussSlider = document.getElementById('gaussSlider');
const threshold = parseInt(document.getElementById('diffThreshold').value); // You can make this adjustable with a slider
/// Original Image
const thumbnailCanvas = document.getElementById('thumbnailCanvas');
const thumbnailCtx = thumbnailCanvas.getContext('2d',{ willReadFrequently: true });
/// Transformed Image
const Tcanvas = document.getElementById('Tcanvas');
const Tctx = Tcanvas.getContext('2d', { willReadFrequently: true });
//Heatmap
const heatmapCanvas = document.getElementById('heatmapCanvas');
const heatmapCtx = heatmapCanvas.getContext('2d',{ willReadFrequently: true });
// reconstruct Image
const reconstructedCanvas = document.getElementById('reconstructedCanvas');
const reconstructedCtx = reconstructedCanvas.getContext('2d',{ willReadFrequently: true });
/// diff Image
const diffCanvas = document.getElementById('diffCanvas');
const diffCtx = diffCanvas.getContext('2d',{ willReadFrequently: true });
///diff with threshold Image 
const diffCanvasthreshold = document.getElementById('diffCanvasthreshold');
const diffCtxthreshold = diffCanvasthreshold.getContext('2d',{ willReadFrequently: true });