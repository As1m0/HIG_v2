let safeZoneData = [];
var ctx = myCanvas.getContext("2d");

// Variables to store rectangle coordinates
var rectX = 0;
var rectY = 0;
var rectWidth = 0;
var rectHeight = 0;

// Function to draw a rectangle
function drawRectangle(x, y, width, height, color) {
  ctx.clearRect(0, 0, myCanvas.width, myCanvas.height); // Clear the canvas
  ctx.fillStyle = color; 
  ctx.fillRect(x, y, width, height); // Draw the rectangle
}

// Event listeners for mouse events
myCanvas.addEventListener('mousedown', function (e) {
  rectX = e.offsetX;
  rectY = e.offsetY;
});

myCanvas.addEventListener('mousemove', function (e) {
  if (e.buttons === 1) { // If mouse button is pressed
    drawRectangle(rectX, rectY, e.offsetX - rectX, e.offsetY - rectY, "rgba(180,47,236,0.5)");
    rectWidth = e.offsetX - rectX;
    rectHeight = e.offsetY - rectY;
  }
});


myCanvas.addEventListener('mouseup', function (e) {

  let rectCenterX = rectX + rectWidth / 2;
  let rectCenterY = rectY + rectHeight / 2;

  safeZoneData = [
    rectCenterX / myCanvas.width,
    rectCenterY / myCanvas.height,
    Math.abs(rectWidth) / myCanvas.width,
    Math.abs(rectHeight) / myCanvas.height
  ];

  drawRectangle(rectX, rectY, e.offsetX - rectX, e.offsetY - rectY, "rgba(0,255,0,0.5)")

  setTimeout(function () {
    ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
    drawBox.style.display = 'none';
    stepNumbers[1].innerHTML = "&check;";
    stepNumbers[1].style.backgroundColor = "#4dc13d";
  }, 300);
});