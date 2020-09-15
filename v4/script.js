let audioCtx, analyser, visualiser = null;

if (document.readyState != 'loading') {
  onDocumentReady();
} else {
  document.addEventListener('DOMContentLoaded', onDocumentReady);
}

// Main initialisation, called when document is loaded and ready.
function onDocumentReady() {
  // 'Reset' button. Remove 'hit' class list on all elements.
  document.getElementById('reset').addEventListener('click', () => {
    document.querySelectorAll('.hit').forEach(elem => elem.classList.remove('hit'));
  });
  visualiser = new Visualiser(document.getElementById('visualiser'));
  visualiser.setExpanded(false); // Collapse at startup

  // Initalise microphone
  navigator.getUserMedia(
    { audio: true },
    onMicSuccess, // Call this when microphone is ready
    error => { console.error('Could not init microphone', error); });
}
// Microphone successfully initalised, now have access to audio data
function onMicSuccess(stream) {
  audioCtx = new AudioContext();

  audioCtx.addEventListener('statechange', () => {
    console.log('Audio context state: ' + audioCtx.state);
  });

  analyser = audioCtx.createAnalyser();

  // fftSize must be a power of 2. Higher values slower, more detailed
  // Range is 32-32768
  analyser.fftSize = 1024;

  // smoothingTimeConstant ranges from 0.0 to 1.0
  // 0 = no averaging. Fast response, jittery
  // 1 = maximum averaging. Slow response, smooth
  analyser.smoothingTimeConstant = 0.1;

  // Microphone -> analyser
  const micSource = audioCtx.createMediaStreamSource(stream);
  micSource.connect(analyser);

  // Start loop
  window.requestAnimationFrame(analyse);
}

function analyse() {
  const bins = analyser.frequencyBinCount;

  // Get frequency and amplitude data
  const freq = new Float32Array(bins);
  const wave = new Float32Array(bins);
  analyser.getFloatFrequencyData(freq);
  analyser.getFloatTimeDomainData(wave);

  // Test whether we hit a threshold between 0-80Hz (bass region)
  var hit = thresholdFrequency(0, 80, freq, -70);
  if (hit) {
    document.getElementById('freqTarget').classList.add('hit');
  }

  // Test whether we hit an peak threshold (this can be a short burst of sound)
  hit = thresholdPeak(wave, 0.9);
  if (hit) {
    document.getElementById('peakTarget').classList.add('hit');
  }

  // Test whether we hit a sustained (average) level
  // This must be a longer, sustained noise.
  hit = thresholdSustained(wave, 0.3);
  if (hit) {
    document.getElementById('susTarget').classList.add('hit');
  }

  // Optional rendering of data
  visualiser.renderWave(wave, true);
  visualiser.renderFreq(freq);

  // Run again
  window.requestAnimationFrame(analyse);
  let freqData = freq;
  return freqData
}

// Returns TRUE if the threshold value is hit between the given frequency range
// Note that FFT size & smoothing has an averaging effect
function thresholdFrequency(lowFreq, highFreq, freqData, threshold) {
  const samples = sampleData(lowFreq, highFreq, freqData);
  let max = Number.MIN_SAFE_INTEGER;
  for (var i = 0; i < samples.length; i++) {
    if (samples[i] > threshold) return true;
    max = Math.max(max, samples[i]);
  }
  // For debugging it can be useful to see maximum value within range
  //console.log('Freq max: ' + max);
  return false;
}

// Returns TRUE if the data hits a peak threshold at any point
// Higher FFT sizes are needed to detect shorter pulses.
function thresholdPeak(waveData, threshold) {
  let max = Number.MIN_SAFE_INTEGER;
  for (var i = 0; i < waveData.length; i++) {
    // Need to use Math.abs to swap negatives into positive
    if (Math.abs(waveData[i]) > threshold) return true;
    max = Math.max(max, Math.abs(waveData[i]));
  }
  // For debugging it can be useful to see maximum value within range
  // console.log('Peak max: ' + max);
  return false;
}

// Returns true if the average amplitude is above threshold across the whole snapshot
// Smaller FFT sizes will have a similar averaging effect
function thresholdSustained(waveData, threshold) {
  let total = 0;
  for (var i = 0; i < waveData.length; i++) {
    // Use Math.abs to swap negatives into positive
    total += Math.abs(waveData[i]);
  }
  const avg = total / waveData.length;

  // For debugging it can be useful to see computed average values
  // console.log('Sustained avg: ' + avg);
  return avg >= threshold;
}

function sampleData(lowFreq, highFreq, freqData) {
  // getIndexForFrequency is a function from util.js
  // it gives us the array index for a given freq
  const lowIndex = getIndexForFrequency(lowFreq, analyser);
  const highIndex = getIndexForFrequency(highFreq, analyser);

  // Grab a 'slice' of the array between these indexes
  const samples = freqData.slice(lowIndex, highIndex);
  return samples;
}

/*
function testVisual() {
    setTimeout(function() {
        //console.log('hello');
        let data = getMySample(20, 40); 
        let specialBucket = Math.abs(data[0]);
        specialBucket = specialBucket;
        specialBucket = Math.round(specialBucket) / 100

        document.getElementById('testObj').style.opacity = specialBucket;
        

        requestAnimationFrame(testVisual);
    }, 10   );
    return true;
}
testVisual();



let orientation = 0;
let colorOne = 'hsl(10, 50%, 50%)';
let colorTwo = 'hsl(200, 50%, 50%)';
grad.style.backgroundImage = '-moz-linear-gradient('
        + orientation + ', ' + colorOne + ', ' + colorTwo + ')';
*/

//CANVAS
let freqRange = 250;
let lowRange = 0;


let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

let xStep = 0;
/*
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);
*/

function drawCanvas() {
    let output = analyse();

    let mySample = output.slice(lowRange, freqRange);
    
   
    let maxBright = 100;
    let times = freqRange;
    let step = maxBright / times;
    let yMove = canvas.height / times; 

    let stepCount = 0;
    let yCount = 0;

    if (xStep > canvas.width) {
      xStep = 0;

      //Clear canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      //ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

    } else {
      for (i = times; i > 0; i--) {
      
      let specialBucket = Math.abs(mySample[i]);
      specialBucket = Math.round(specialBucket);

      //console.log(specialBucket);
      
      //console.log('BRIGHT ' + specialBucket);
      //console.log('MOVE ' + yCount);

      //ctx.fillStyle = "hsl(100, 100%, " + specialBucket + "%)";
      let wColor = Math.floor(specialBucket / 100 * 240);
      //console.log(wColor);
      ctx.fillStyle = "hsl(" + wColor + ", " + specialBucket + "%, " + specialBucket + "%)";
      ctx.fillRect(xStep, yCount, canvas.width/1000, yMove);

      yCount += yMove;
      //console.log("Drawn: " + i + "#");
      //xStep += i;
      }
    }

    xStep = xStep + 0.5
    //ctx.fillStyle = "rgb(0, 255, 255";
    //ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTimeout(function() {
        //console.log("let's do it again");
        window.requestAnimationFrame(drawCanvas);
    }, 0);
}

setTimeout(function() {
    drawCanvas();
}, 1000);




//SLIDER
var slider = document.getElementById("myRange");

slider.oninput = function() {
  freqRange = slider.value;
  //console.log(freqRange);
}

var slider2 = document.getElementById("lowRange");

slider2.oninput = function() {
  lowRange = slider2.value;
  //console.log(freqRange);
}
