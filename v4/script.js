let audioCtx, analyser, visualiser = null;
let intervalMeter = new IntervalMeter(5, 200);

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

  let hit = thresholdPeak(wave, 0.9);
  if (hit) {
    peakAction();
  }

  //If a peak and a certain frequency is active 
  let hitMe = thresholdPeak(wave, 0.9);
  let hitTwo = thresholdFrequency (50, 80, freq, -70);
  if (hitMe && hitTwo) {
    ballon.color = 'rgb(0, 0, 0)';
  } else {
    ballon.color = 'rgb(0, 255, 0)';
  }

  let susHit = thresholdSustained(wave, 0.1);

  if (susHit == true && wiggleState == false) {
    wiggleState = true;
    //console.log(susHit);
  } else if (susHit == false && wiggleState == true) {
    wiggleState = false;
    //console.log(susHit);
  } 

  // Optional rendering of data
  visualiser.renderWave(wave, true);
  visualiser.renderFreq(freq);


  
  // Run again
  window.requestAnimationFrame(analyse);
  let freqData = freq;
  return freqData;
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
let peakData;

function thresholdPeak(waveData, threshold) {
  let max = Number.MIN_SAFE_INTEGER;
  for (var i = 0; i < waveData.length; i++) {
    // Need to use Math.abs to swap negatives into positive
    if (Math.abs(waveData[i]) > threshold) return true;
    max = Math.max(max, Math.abs(waveData[i]));
    peakData = max;
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

function  averageAmp(freqData) {
  let total = 0;
  for (var i = 0; i < freqData.length; i++) {
    // Use Math.abs to swap negatives into positive
    total += Math.abs(freqData[i]);
  }
  const avg = total / freqData.length;

  // For debugging it can be useful to see computed average values
  // console.log('Sustained avg: ' + avg);
  return avg;
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




//////////////
//  CANVAS

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

//Set balloon size
let orgSize = 25;
let bgState = 1;
let bColorState = 'green';

let ballon = { 
  x: 0, 
  y: 0, 
  size: orgSize,
  color: 'rgb(0, 255, 0)',
};

function drawCanvas() {
  if (ballon.size > 600) {
    bgState = 1;
    ballon.size = orgSize;

    centerBallon();
  }
  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  background();
  ctx.beginPath();
  ctx.arc(ballon.x, ballon.y, ballon.size, 0, 2 * Math.PI);
  ctx.fillStyle = 'hsla(' + colorCycle + ', 50%, 50%, 0.5';
 
  ctx.fill();
}
let colorCycle = 0;

function centerBallon() {
  let os = ballon.size;

  let wt = canvas.width;
  let ht = canvas.height;
  ballon.x = wt/2;
  ballon.y = ht/2;

  drawCanvas();
}

function background(){
  let a = Math.floor(255 / bgState / 255);
  let b = Math.floor(255 / bgState / 255);
  let c = Math.floor(255 / bgState / 255);
  
  //let color = 'rgba(' + a + ', ' + b +', ' + c + ', ' + bgState + ')';
  //let color = 'rgba(120, 120, 120, ' + bgState + ')';


  colorCycle = Math.floor(peakData * 150);

  if (colorCycle > 255){
    colorCycle = 255;
  }
  //console.log(colorCycle);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'  ;
  
  //console.log(color);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function colorBalloon(){
  if (bColorState == 'red') { //red
    ctx.fillStyle = 'rgb(255, 0, 0)';
    bColorState = 'red';

  } else if (bColorState == 'blue') { 
    ctx.fillStyle = 'rgb(0, 0, 255)';
    bColorState = 'blue';
  } else { //default green
    //ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillStyle = 'rgb(0, 255, 0)';
    bColorState = 'green';
  }
  //console.log('balloon color: ' + bgState);
};

centerBallon();

//PEAK

function peakAction() {
  ballon.size += 1.2;
  //console.log(ballon.size);
  drawCanvas();
}

//VOLUME
/*
requestAnimationFrame(() => {
  setTimeout(() => {
    console.log('hi');
    console.log('avg amp');
    console.log('........');

    let data = analyse();
    console.log(averageAmp(data));

    console.log('........');
    console.log('done');
    console.log('-------');
  }, 1000);
});
*/

function timeout() {
  setTimeout(function () {
    let hi = 150;
    let lo = 70;

    let data = analyse();
    let avg = averageAmp(data);
  
    let flatten = Math.floor((avg/ hi) * 100);
    flatten = flatten /100;

    bgState = flatten;

    
    //console.log('avg = ' + avg);
    //console.log('flatten = ' + flatten);
    //console.log('color = ' + color);

    drawCanvas(); //Draw canvas
    timeout(); //loop
  }, 100);
}

timeout();



function volumeColor() {
  ballon.size *= 1.2;
  //console.log(ballon.size);
  drawCanvas();
}

//bpm

function push(distance) {
  let randomX = Math.floor(Math.random() * distance);
  let randomY = Math.floor(Math.random() * distance);

  if (Math.random() < 0.5) {
    ballon.x -= randomX;
    ballon.y -= randomY;
  } else {
    ballon.x += randomX;
    ballon.y += randomY;
  }
  
}
function shrink() {
  if (ballon.size == orgSize) {
    return true;
  } else if (ballon.size > orgSize) {
    ballon.size -= 0.22;
  } else {
    return true;
  }
}
function returnHome() {
  //centerBallon();
  if (wiggleState == true || ballon.x == canvas.width / 2 && ballon.y == canvas.height / 2) {
      shrink();
      return true;
  } else {
    //for X
    if (ballon.x > canvas.width / 2) {
      ballon.x -= 1;
    } else if (ballon.x < canvas.width / 2) {
      ballon.x += 1;
    }
  
    //for Y
    if (ballon.y > canvas.height / 2) {
      ballon.y -= 1;
    } else if (ballon.y < canvas.height / 2) {
      ballon.y += 1;
    }
  }
  drawCanvas();
  requestAnimationFrame(returnHome);
}

let wiggleState = false; 

function wiggle() {
  let relative = peakData * 55;

  if (wiggleState == false) {
    returnHome();
  } else {
    //let rand = Math.random() * relative;
    
    push(relative);
  }
  requestAnimationFrame(wiggle);
}

wiggle(); 









/*
let movement = 20;
let crazyState = false; 










function animate() {

  if (crazyState == false) {
    //colorBalloon();
    drawCanvas();
  
    requestAnimationFrame(animate);

  } else {
    let xMove = 1;
    let yMove = 1;

    if (xMove < 100) {
      centerBallon(); 

      ballon.x = ballon.x + Math.floor(Math.random() * movement);
      ballon.y = ballon.y + Math.floor(Math.random() * movement);
      colorBalloon('red');

      drawCanvas();
    } else if (xMove > 200) {
      xMove = 1;
  
    } else {
      centerBallon(); 

      ballon.x = ballon.x + Math.abs(Math.floor(Math.random() * movement));
      ballon.y = ballon.y + Math.abs(Math.floor(Math.random() * movement));

      drawCanvas();
    }
    requestAnimationFrame(animate);
  }
}

let pushVector = 0.1; 

function push(distance) {
  let randomX = Math.floor(Math.random() * distance);
  let randomY = Math.floor(Math.random() * distance);

  if (Math.random() < 0.5) {
    ballon.x -= randomX;
    ballon.y -= randomY;
  } else {
    ballon.x += randomX;
    ballon.y += randomY;
  }
  
}

animate();

let wiggleState = false; 

function wiggle() {
  if (wiggleState == false) {
    //
  } else {
    let rand = Math.random() * 10;
    push(rand);
  }
  requestAnimationFrame(wiggle);
}

wiggle(); 


function behavior1() {
  let triggerAmplitude = 10;

  let output = analyse();
  let mySample = output.slice(20, 100);

  for (i = 0; i < mySample.length; i++) {
    let inverse = Math.abs(mySample[i]);

    if (inverse> triggerAmplitude) {

      //Action 
      console.log('trigger - behavior 1');
      return;
    }
  }
  requestAnimationFrame(behavior1);
}


*/

//Actions

/**
 // Test whether we hit a threshold between 0-80Hz (bass region)
  var hit = thresholdFrequency(0, 80, freq, -70);
  if (hit) {
    document.getElementById('freqTarget').classList.add('hit');
  }

  // Test whether we hit an peak threshold (this can be a short burst of sound)
  hit = thresholdPeak(wave, 0.9);
  if (hit) {
    document.getElementById('peakTarget').classList.add('hit');
  
    colorBalloon('blue');
    ballon.size = ballon.size * 1.20;
    wiggleState = true;
    setTimeout(function() {
      wiggleState = false;
    }, 1000 - (ballon.size * 7));
    drawCanvas();
  }
  // Test whether we hit a sustained (average) level
  // This must be a longer, sustained noise.
  hit = thresholdSustained(wave, 0.3);
  if (hit) {
    document.getElementById('susTarget').classList.add('hit');
    crazyState = true;

  } else if (hitCount == 1) {
    crazyState = false;
    //colorBalloon();
  }




  //random color 

function randomColor() {
  let x = Math.floor(Math.random() * 255);
  let y = Math.floor(Math.random() * 255);
  let z = Math.floor(Math.random() * 255);
  let newColor = "rgb(" + x + ", " + y + ", " + z + ")"
  console.log(newColor); 
  return newColor; 
}

 */