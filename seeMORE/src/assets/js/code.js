/var large = false;
var margin = 10;
var DoGBox = {
  blockNumber: 25,
  blockSize: 4,
  additionalHeight: 10
};
var ExtremaBox = {
  blockNumber: 3,
  blockSize: 48
};
var ReferenceBox = {
  blockNumber: 39,
  blockSize: 3,
  howMany: 1
};
var DescriptorBox = {
  blockNumber: 53,
  blockSize: 2,
  howMany: 1
};
var minSize = 32, maxSize = 1024, showMax = 128;
var imageWidth, imageHeight;
var dropZone;
var input;
var numberOfScales = 3;
var numberOfOctaves;
var contrastThreshold = 0.015;
var edgeThreshold = (10 + 1) * (10 + 1) / 10;
var scaleSpace;
var partialX;
var partialY;
var differenceOfGaussians;
var scSpMinMax;
var doGMinMax;
var extrema;
var interpolated;
var references;
var descriptors;
var deltaMin = 0.5;
var sigmaMin = 0.8;
var sigmaIn = 0.5;
var numberOfBinsGrad = 36;
var lambdaOri = 1.5;
var orientationThreshold = 0.8;
var numberOfHistograms = 4;
var numberOfBinsDescr = 8;
var lambdaDescr = 6;
var smoothKernel = [1/3, 1/3, 1/3];
var grayScaleWidth = 200;
var binWidth = 5;

var colors = [
  "#29AB87", "#FF00FF", "#00FFFF", "#7FFFD0", "#FF4500", "#191970",
  "#228B22", "#CC6666", "#0085CA", "#2E8B57", "#800000", "#7851A9",
  "#00FF00", "#CE0058", "#8F00FF", "#556B2F", "#E10098", "#FF7E00"
];

function dragOverHandler (event) {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}

function dropHandler (event) {
  event.stopPropagation();
  event.preventDefault();

  var file = event.dataTransfer.files[0];
  if (file.type.match("image.*"))
    readImage(file, function (image) {
      imageWidth = image.width;
      imageHeight = image.height;
      if (imageWidth < minSize || imageHeight < minSize)
        alert("Please use a larger image.");
      else if (imageWidth > maxSize || imageHeight > maxSize)
        alert("Please use a smaller image.");
      else
        processImage(image);
    });
}

function readImage (file, continuation) {
  var reader = new FileReader();
  reader.addEventListener("load", function () {
    var image  = new Image();
    image.addEventListener("load", function () {
      continuation(image);
    });
    image.src = reader.result;
  });
  reader.readAsDataURL(file);  
}

function processImage (image) {
  clearBox("DoGExplain", DoGBox);
  clearBox("ExtremaExplain", ExtremaBox, true);
  clearBox("ReferenceExplain", ReferenceBox);
  clearBox("DescriptorExplain", DescriptorBox);
  clearTable();
  clearHistograms();
  clearPie();

  var max = Math.max(imageWidth, imageHeight);
  if (max > showMax) {
    imageWidth = Math.round(imageWidth * showMax / max);
    imageHeight = Math.round(imageHeight * showMax / max);
  }
  d3.select("#imageWidth").text(imageWidth);
  d3.select("#imageHeight").text(imageHeight);

  dropZone.width = imageWidth;
  dropZone.height = imageHeight;
  dropZone.getContext("2d").drawImage(image, 0, 0, imageWidth, imageHeight);
  input = imageToMatrix();

  computeScaleSpace();
  showScaleSpace("scaleSpace", 0, 2 + numberOfScales);
  computeDifferences();
  showDifferences("DoG", 0, 1 + numberOfScales, null, null, true);
  extrema = findExtrema();
  showDifferences("extrema", 1, numberOfScales, extrema, contrastChecker("value", 0.8));

  interpolated = keypointInterpolation(discardPoints(extrema, contrastChecker("value", 0.8)));

  checkContrastAgain = contrastChecker("omega");
  var check = function (point) {
    return checkContrastAgain(point) && checkEdginess(point);
  };
  showDifferences("keyPoints", 1, numberOfScales, interpolated, check, false);
  references = discardPoints(interpolated, check);

  computeGradients();
  references = computeReferenceOrientations(references);
  showScaleSpace("reference", 1, numberOfScales, references);

  descriptors = computeDescriptors(references);
  showScaleSpace("descriptors", 1, numberOfScales, descriptors);
}

function rho (s) {
  return Math.sqrt(Math.pow(2, 2 * s / numberOfScales) - Math.pow(2, 2 * (s - 1) / numberOfScales)) * sigmaMin / deltaMin;
}

function computeScaleSpace () {
  numberOfOctaves = Math.floor(Math.log2(Math.min(input.width, input.height))) - 2;
  scaleSpace = new Array(numberOfOctaves + 1);
  scaleSpace[0] = [bilinearInterpolation(input)];
  for (var octave = 1; octave <= numberOfOctaves; octave++) {
    scaleSpace[octave] = new Array(numberOfScales + 3);
    scaleSpace[octave][0] =
      octave == 1 ?
      convolveGaussian(Math.sqrt(sigmaMin * sigmaMin - sigmaIn * sigmaIn) / deltaMin, scaleSpace[0][0]) :
      subsample(scaleSpace[octave - 1][numberOfScales]);
    for (var scale = 1; scale <= 2 + numberOfScales; scale++)
      scaleSpace[octave][scale] = convolveGaussian(rho(scale), scaleSpace[octave][scale - 1]);
  }
}

function showScaleSpace (id, scaleFrom, scaleTo, keyPoints, testFunction) {
  var first = !keyPoints;
  var imgWidth = scaleSpace[0][0].width;
  var y = margin;
  for (var octave = first ? 1 : 2; octave <= numberOfOctaves + 1; octave++)
    y += margin + scaleSpace[octave - 1][0].height;
  var canvas = document.getElementById(id);
  canvas.width = (1 + scaleTo - scaleFrom) * (imgWidth + margin) + margin;
  var grayScaleStart = y + margin;
  if (first)
    y += 4 * margin;
  canvas.height = y;
  var context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (first)
    scSpMinMax = computeGlobalMinMax(scaleSpace);

  y = margin;
  var centers = [];
  if (first)
    centers.push(matrixToImage(id, normalize(scaleSpace[0][0], scSpMinMax), margin, y));
  for (octave = 1; octave <= numberOfOctaves; octave++) {
    if (first || octave > 1)
      y += margin + scaleSpace[octave - 1][0].height;
    var x = margin;
    for (var scale = scaleFrom; scale <= scaleTo; scale++) {
      var center =
            matrixToImage(
              id, normalize(scaleSpace[octave][scale], scSpMinMax),
              (scale - scaleFrom) * (imgWidth + margin) + margin, y
            );
      if (octave == 1 && (scale >= 0 && scale <= 2 || scale == 5) || octave == 2 && scale == 0)
        centers.push(center);
      if (keyPoints)
        pointsToImage(id, filterPoints(octave, scale, keyPoints), x, y, testFunction);
      x += imgWidth + margin;
    }
  }

  if (first) {
    drawArrow(context, centers[0], centers[1], "rgba(255, 165, 0, 0.7)");
    drawArrow(context, centers[2], centers[3], "rgba(0, 255, 0, 0.7)");
    drawArrow(context, centers[4], centers[5], "rgba(0, 0, 255, 0.7)");
    
    showGrayScale(canvas, grayScaleStart, scSpMinMax);
  }
}

function computeDifferences () {
  differenceOfGaussians = new Array(numberOfOctaves + 1);
  for (var octave = 1; octave <= numberOfOctaves; octave++) {
    differenceOfGaussians[octave] = new Array(numberOfScales + 2);
    for (var scale = 0; scale <= 1 + numberOfScales; scale++)
      differenceOfGaussians[octave][scale] = matrixDifference(scaleSpace[octave][scale + 1], scaleSpace[octave][scale]);
  }
  doGMinMax = computeGlobalMinMax(differenceOfGaussians);
}

function showDifferences (id, scaleFrom, scaleTo, keyPoints, testFunction, withGrayScale) {
  var imgWidth = differenceOfGaussians[1][0].width;
  var y = margin;
  for (var octave = 1; octave <= numberOfOctaves; octave++)
    y += margin + scaleSpace[octave][0].height;
  var canvas = document.getElementById(id);
  canvas.width = (1 + scaleTo - scaleFrom) * (imgWidth + margin) + margin;
  if (withGrayScale) {
    var grayScaleStart = y + margin;
    canvas.height = y + margin * 4;
  } else {
    canvas.height = y;
  }
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

  y = margin;
  for (octave = 1; octave <= numberOfOctaves; octave++) {
    var x = margin;
    for (var scale = scaleFrom; scale <= scaleTo; scale++) {
      matrixToImage(id, normalize(differenceOfGaussians[octave][scale], doGMinMax), x, y);
      if (keyPoints)
        pointsToImage(id, filterPoints(octave, scale, keyPoints), x, y, testFunction);
      x += imgWidth + margin;
    }
    y += margin + differenceOfGaussians[octave][0].height;
  }

  if (withGrayScale)
    showGrayScale (canvas, grayScaleStart, doGMinMax, 4);
}

function pointsToImage(id, pointList, xOffset, yOffset, testFunction) {
  testFunction = testFunction || function () { return true; };
  var canvas = document.getElementById(id);
  var context = canvas.getContext("2d");
  pointList.forEach(function (point) {
    context.beginPath();
    context.arc(point.xIndex + xOffset, point.yIndex + yOffset, 2, 0, twoPi);
    context.lineWidth = 1;
    context.strokeStyle = testFunction(point) ? 'red' : 'yellow';
    context.stroke();
  });
}

function filterPoints (octave, scale, pointList) {
  var result = [];
  pointList.forEach(function (point) {
    if (point.octave == octave && point.scale == scale)
      result.push(point);
  });
  return result;
}

function findExtrema () {
  var extrema = [];
  for (var octave = 1; octave <= numberOfOctaves; octave++) {
    for (var scale = 1; scale <= numberOfScales; scale++) {
      var thisMatrix = differenceOfGaussians[octave][scale];
      var width = thisMatrix.width;
      var height = thisMatrix.height;
      var matrixes = [
        thisMatrix.data,
        differenceOfGaussians[octave][scale-1].data,
        differenceOfGaussians[octave][scale+1].data
      ];
      for (var y = 1; y < height - 1; y++) {
        var i = y * width;
        for (var x = 1; x < width - 1; x++) {
          i++;
          var val = thisMatrix.data[i];
          var maybeMin = true;
          var maybeMax = true;
          matrixes.forEach(function (matrix) {
            if (maybeMax)
              if (matrix[i - width - 1] > val ||
                  matrix[i - width] > val ||
                  matrix[i - width + 1] > val ||
                  matrix[i - 1] > val ||
                  matrix[i + 1] > val ||
                  matrix[i + width - 1] > val ||
                  matrix[i + width] > val ||
                  matrix[i + width + 1] > val)
                maybeMax = false;
            if (maybeMin)
              if (matrix[i - width - 1] < val ||
                  matrix[i - width] < val ||
                  matrix[i - width + 1] < val ||
                  matrix[i - 1] < val ||
                  matrix[i + 1] < val ||
                  matrix[i + width - 1] < val ||
                  matrix[i + width] < val ||
                  matrix[i + width + 1] < val)
                maybeMin = false;
          });
          if (maybeMin)
            if (matrixes[1][i] < val || matrixes[2][i] < val)
              maybeMin = false;
          if (maybeMax)
            if (matrixes[1][i] > val || matrixes[2][i] > val)
              maybeMax = false;
          if (maybeMin || maybeMax)
            extrema.push({
              octave: octave,
              scale: scale,
              xIndex: x,
              yIndex: y,
              value: val
            });
        }
      }
    }
  }
  return extrema;
}

function imageToMatrix () {
  var data = dropZone.getContext("2d").getImageData(0, 0, imageWidth, imageHeight).data;
  var result = new Matrix(imageWidth, imageHeight);
  var resultData = result.data;
  for (var i = 0, j = 0; i < data.length; i += 4, j++)
    resultData[j] = (data[i] + data[i+1] + data[i+2]) / 765;
  return result;
}
function matrixToImage (id, matrix, x, y) {
  var canvas = document.getElementById(id);
  var context = canvas.getContext("2d");
  var imgData = context.createImageData(matrix.width, matrix.height);
  var data = imgData.data;
  var matrixData = matrix.data;
  var i = 0;
  for (var j = 0; j < matrix.length; j++) {
    var val = matrixData[j];
    data[i++] = val;
    data[i++] = val;
    data[i++] = val;
    data[i++] = 255;
  }
  context.putImageData(imgData, x, y);
  return [
    x + matrix.width / 2,
    y + matrix.height / 2
  ];
}

function contrastChecker (slot, factor) {
  factor = factor || 1;
  return function (point) {
    return Math.abs(point[slot]) >= factor * contrastThreshold;
  };
}

function discardPoints (pointList, checkFn) {
  var result = [];
  pointList.forEach(function (point) {
    if (checkFn(point))
      result.push(point);
  });
  return result;
}

function delta (octave) {
  return deltaMin * Math.pow(2, octave - 1);
}

function keypointInterpolation (pointList) {
  var result = [];
  pointList.forEach(function (point) {
    var i = 0;
    while (i < 5) {
      var q = quadraticInterpolation(point);
      if (!q)
        break;
      var alpha = q[0];
      var newScale = point.scale + alpha[0];
      var newX = point.xIndex + alpha[1];
      var newY = point.yIndex + alpha[2];
      point = {
        octave: point.octave,
        scale: Math.round(newScale),
        xIndex: Math.round(newX),
        yIndex: Math.round(newY),
        oldXindex: point.oldXindex ? point.oldXindex : point.xIndex,
        oldYindex: point.oldYindex ? point.oldYindex : point.yIndex,
        oldScale: point.oldScale ? point.oldScale : point.scale
      };
      if (point.scale < 1 || point.scale > numberOfScales ||
          point.xIndex < 1 || point.xIndex + 1 >= differenceOfGaussians[point.octave][point.scale].width ||
          point.yIndex < 1 || point.yIndex + 1 >= differenceOfGaussians[point.octave][point.scale].height)
        break;
      if (Math.abs(alpha[0]) < 0.6 && Math.abs(alpha[1]) < 0.6 && Math.abs(alpha[2]) < 0.6) {
        var deltaO = delta(point.octave);
        result.push({
          octave: point.octave,
          scale: point.scale,
          xIndex: point.xIndex,
          yIndex: point.yIndex,
          sigma: deltaO / deltaMin * sigmaMin * Math.pow(2, newScale / numberOfScales),
          x: deltaO * newX,
          y: deltaO * newY,
          omega: q[1],
          interpolatedScale: newScale,
          oldXindex: point.oldXindex,
          oldYindex: point.oldYindex,
          oldScale: point.oldScale
        });
        break;
      }
      i++;
    }
  });
  return result;
}

function checkEdginess (point) {
  var Hessian = Hessian2D(point);
  var traceHessian = trace(Hessian);
  return traceHessian * traceHessian / determinant(Hessian) < edgeThreshold;
}

function init () {
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert("Sorry, this will NOT work!  The File APIs are not fully supported in this browser.");
  }

  dropZone = document.getElementById("dropZone");
  dropZone.addEventListener("dragover", dragOverHandler, false);
  dropZone.addEventListener("drop", dropHandler, false);

  if (document.URL.match(/size=large/)) {
    d3.select("body").insert("p", "p")
      .html('[If your screen isn\'t very wide (less than 1600 pixels), click <a href="./index.html">here</a> for a smaller version of the same page.]');
    large = true;
  } else {
    dropZone.width = 64;
    dropZone.height = 64;
    showMax = 64;
    d3.selectAll(".showMax").text(showMax);
    d3.select("body").insert("p", "p")
      .html('[Click <a href="./index.html?size=large">here</a> if you have a large screen (at least 1600 pixels wide).]');
  }

  var defaultImage = d3.select("#default").node();
  imageWidth = defaultImage.width;
  imageHeight = defaultImage.height;
  processImage(defaultImage);

  d3.select("#DoG").on("mousedown", DoGMouseDown);
  d3.select("#extrema").on("mousedown", extremaMouseDown);
  d3.select("#keyPoints").on("mousedown", keyPointsMouseDown);
  d3.select("#reference").on("mousedown", referenceMouseDown);
  d3.select("#descriptors").on("mousedown", descriptorMouseDown);
}

function identity (x) {
  return x;
}

function setTable (values) {
  d3.selectAll("td.numTD").data(values);
  ["x", "y", "s"].forEach(function (varName) {
    ["Old", "New"].forEach(function (suffix) {
      d3.select("#" + varName + suffix).text(identity);
    });
  });
}

function clearTable () {
  setTable(["", "", "", "", "", ""]);
}

function clearBox (id, boxInfo, grid) {
  var howMany = boxInfo.howMany || 3;
  var box = d3.select("#" + id).node();
  box.width = (howMany + 1) * margin + howMany * boxInfo.blockNumber * boxInfo.blockSize;
  box.height = 2 * margin + boxInfo.blockNumber * boxInfo.blockSize;
  if (boxInfo.additionalHeight)
    box.height += boxInfo.additionalHeight;
  var context = box.getContext("2d");
  context.clearRect(0, 0, box.width, box.height);
  if (grid)
    for (var which = 0; which < howMany; which++)
      for (var i = 0; i < boxInfo.blockNumber; i++)
        for (var j = 0; j < boxInfo.blockNumber; j++)
          drawBoxCell(id, boxInfo, which, i, j, null, "LightGreen");
}

function drawBoxCell (id, boxInfo, which, x, y, fillColor, strokeColor, text, textColor) {
  var box = d3.select("#" + id).node();
  var context = box.getContext("2d");
  var fromX = margin + which * (boxInfo.blockNumber * boxInfo.blockSize + margin) + x * boxInfo.blockSize;
  var fromY = margin + y * boxInfo.blockSize;
  context.beginPath();
  if (fillColor) {
    context.fillStyle = fillColor;
    context.fillRect(fromX, fromY, boxInfo.blockSize, boxInfo.blockSize);
  } else
    context.clearRect(fromX, fromY, boxInfo.blockSize, boxInfo.blockSize);
  if (strokeColor) {
    context.strokeStyle = strokeColor;
    context.lineWidth = (strokeColor == 'red' ? 1 : 2.5);
    context.rect(fromX, fromY, boxInfo.blockSize, boxInfo.blockSize);
    context.stroke();
  }
  if (text) {
    context.beginPath();
    context.fillStyle = textColor || "LightGreen";
    context.textAlign = "center";
    context.font = context.font.replace(/\d+px/, "9px");
    context.textBaseline = "middle";
    context.fillText(text, fromX + .5 * boxInfo.blockSize, fromY + .5 * boxInfo.blockSize);
  }
}

function genericMouseDown (scaleFrom, scaleTo, callback) {
  var imgWidth = differenceOfGaussians[1][0].width;

  var mouseX = d3.event.offsetX;
  var mouseY = d3.event.offsetY;

  var y = margin;
  for (octave = 1; octave <= numberOfOctaves; octave++) {
    var h = differenceOfGaussians[octave][0].height;
    var w = differenceOfGaussians[octave][0].width;
    var x = margin;
    for (var scale = scaleFrom; scale <= 1 + scaleTo; scale++) {
      if (mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h) {
        callback(octave, scale, mouseX - x, mouseY - y);
        return;
      }
      x += imgWidth + margin;
    }
    y += margin + h;
  }
}

function DoGMouseDown () {
  genericMouseDown(0, 1 + numberOfScales, explainDoG);
}

function extremaMouseDown () {
  genericMouseDown(1, numberOfScales, explainer(extrema, explainExtremum));
}

function keyPointsMouseDown () {
  genericMouseDown(1, numberOfScales, explainer(interpolated, explainKeyPoints));
}

function referenceMouseDown () {
  genericMouseDown(1, numberOfScales, explainer(references, explainReference));
}

function descriptorMouseDown () {
  genericMouseDown(1, numberOfScales, explainer(descriptors, explainDescriptor));
}

function explainer (points, callback) {
  return function (octave, scale, x, y) {
    var done = false;
    points.forEach(function (point) {
      if (!done && point.octave == octave && point.scale == point.scale &&
          normSquared(point.xIndex - x, point.yIndex - y) < 10) {
        done = true;
        callback(point);
      }
    });
  };
}

function explainKeyPoints (point) {
  var deltaOct = delta(point.octave);
  setTable([
    deltaOct < 1 ? formatNumber(point.oldXindex * deltaOct, 1) : point.oldXindex * deltaOct,
    formatNumber(point.x, 3),
    deltaOct < 1 ? formatNumber(point.oldYindex * deltaOct, 1) : point.oldYindex * deltaOct,
    formatNumber(point.y, 3),
    point.oldScale,
    formatNumber(point.interpolatedScale, 3)
  ]);
}

function explainDescriptor (point) {
  var octave = point.octave;
  var scale = point.scale;
  var x = point.xIndex;
  var y = point.yIndex;
  var theta = point.orientation;

  var arr = scaleSpace[octave][scale];
  clearBox("DescriptorExplain", DescriptorBox);
  var offset = Math.floor(DescriptorBox.blockNumber / 2);
  function oneCell (i, j) {
    drawBoxCell("DescriptorExplain", DescriptorBox, 0, i, j,
                computeColor(arr, x + i - offset, y + j - offset, scSpMinMax)
               );
  }
  for (var i = 0; i < DescriptorBox.blockNumber; i++)
    for (var j = 0; j < DescriptorBox.blockNumber; j++)
      oneCell(i, j);

  var context = d3.select("#DescriptorExplain").node().getContext("2d");
  var center = DescriptorBox.blockNumber * DescriptorBox.blockSize / 2 + margin;
  var patchWidth = 2 * lambdaDescr * sigma(octave, scale) / delta(octave) * DescriptorBox.blockSize;
  context.translate(center, center);
  context.rotate(theta);
  drawArrow(context, [0, 0], [0, center - 2 * margin], "rgba(0, 255, 0, 0.7)", 1.2);
  drawArrow(context, [0, 0], [center - 2 * margin, 0], "rgba(0, 255, 0, 0.7)", 1.2);
  context.beginPath();
  context.fillStyle = "rgba(0, 255, 0, 0.25)";
  context.arc(0, 0, patchWidth / 2, 0, twoPi);
  context.fill();

  showHistograms(point.descriptor);
}

function explainReference (point) {
  var octave = point.octave;
  var scale = point.scale;
  var x = point.xIndex;
  var y = point.yIndex;
  var theta = point.orientation;

  var arr = scaleSpace[octave][scale];
  clearBox("ReferenceExplain", ReferenceBox);
  var offset = Math.floor(ReferenceBox.blockNumber / 2);
  function oneCell (i, j) {
    drawBoxCell("ReferenceExplain", ReferenceBox, 0, i, j,
                computeColor(arr, x + i - offset, y + j - offset, scSpMinMax)
               );
  }
  for (var i = 0; i < ReferenceBox.blockNumber; i++)
    for (var j = 0; j < ReferenceBox.blockNumber; j++)
      oneCell(i, j);

  var context = d3.select("#ReferenceExplain").node().getContext("2d");
  var center = ReferenceBox.blockNumber * ReferenceBox.blockSize / 2 + margin;

  var patchWidth = 6 * lambdaOri * sigma(octave, scale) / delta(octave) * ReferenceBox.blockSize;
  context.beginPath();
  context.fillStyle = "rgba(0, 255, 0, 0.2)";
  context.fillRect(center - patchWidth / 2, center - patchWidth / 2, patchWidth, patchWidth);

  var arrowFrom = [center, center];
  var arrowTo = [center + 40 * Math.cos(theta), center + 40 * Math.sin(theta)];
  drawArrow(context, arrowFrom, arrowTo, "rgba(0, 255, 0, 0.7)", 1.8);

  drawPie(point.histogram);
}

function explainExtremum (point) {
  var octave = point.octave;
  var scale = point.scale;
  var x = point.xIndex;
  var y = point.yIndex;

  clearBox("ExtremaExplain", ExtremaBox);
  var offset = Math.floor(ExtremaBox.blockNumber / 2);
  function oneCell (i, j) {
    for (var k = 0; k < 3; k++) {
      var arr = differenceOfGaussians[octave][scale + k - 1];
      drawBoxCell("ExtremaExplain", ExtremaBox, k, i, j,
                  computeColor(arr, x + i - offset, y + j - offset, doGMinMax),
                  "LightGreen", formatNumber(arr.aref(x + i - offset, y + j - offset), 4)
                 );
    }
  }
  for (var i = 0; i < ExtremaBox.blockNumber; i++)
    for (var j = 0; j < ExtremaBox.blockNumber; j++)
      oneCell(i, j);
  drawBoxCell("ExtremaExplain", ExtremaBox, 1, offset, offset,
              computeColor(
                differenceOfGaussians[octave][scale],
                x,
                y,
                doGMinMax
              ),
              "LightGreen",
              formatNumber(differenceOfGaussians[octave][scale].aref(x, y), 4),
              contrastChecker("value", 0.8)(point) ? 'Tomato' : 'yellow'
             );
}

function explainDoG (octave, scale, x, y) {
  clearBox("DoGExplain", DoGBox);
  var offset = Math.floor(DoGBox.blockNumber / 2);
  function oneCell (i, j, strokeColor) {
    drawBoxCell("DoGExplain", DoGBox, 0, i, j,
                computeColor(
                  scaleSpace[octave][scale],
                  x + i - offset,
                  y + j - offset,
                  scSpMinMax
                ),
                strokeColor
               );
    drawBoxCell("DoGExplain", DoGBox, 1, i, j,
                computeColor(
                  differenceOfGaussians[octave][scale],
                  x + i - offset,
                  y + j - offset,
                  doGMinMax
                ),
                strokeColor
               );
    drawBoxCell("DoGExplain", DoGBox, 2, i, j,
                computeColor(
                  scaleSpace[octave][scale + 1],
                  x + i - offset,
                  y + j - offset,
                  scSpMinMax
                ),
                strokeColor
               );
  }

  for (var i = 0; i < DoGBox.blockNumber; i++)
    for (var j = 0; j < DoGBox.blockNumber; j++)
      oneCell(i, j);
  oneCell(offset, offset, 'red');

  var box = d3.select("#DoGExplain").node();
  var context = box.getContext("2d");
  context.beginPath();
  context.fillStyle = "black";
  context.textAlign = "center";
  context.fillText(
    formatNumber(scaleSpace[octave][scale].aref(x, y), 3),
    (box.width - 4 * margin) / 6 + 1 * margin,
    box.height - 7
  );
  context.fillText(
    formatNumber(differenceOfGaussians[octave][scale].aref(x, y), 3),
    3 * (box.width - 4 * margin) / 6 + 2 * margin,
    box.height - 7
  );
  context.fillText(
    formatNumber(scaleSpace[octave][scale + 1].aref(x, y), 3),
    5 * (box.width - 4 * margin) / 6 + 3 * margin,
    box.height - 7
  );
}

function computeColor(matrix, x, y, minMax) {
  if (x >= 0 && x < matrix.width && y >= 0 && y < matrix.height) {
    var c = Math.round(normalizeNumber(matrix.aref(x, y), minMax));
    return "rgb(" + c + "," + c + "," + c + ")";
  }
}

function computeGradients () {
  partialX = new Array(numberOfOctaves + 1);
  partialY = new Array(numberOfOctaves + 1);
  for (var octave = 1; octave <= numberOfOctaves; octave++) {
    partialX[octave] = new Array(numberOfScales + 1);
    partialY[octave] = new Array(numberOfScales + 1);
    var width = scaleSpace[octave][0].width;
    var height = scaleSpace[octave][0].height;
    for (var scale = 1; scale <= numberOfScales; scale++) {
      partialX[octave][scale] = new Matrix(width, height);
      partialY[octave][scale] = new Matrix(width, height);
      var dataX = partialX[octave][scale].data;
      var dataY = partialY[octave][scale].data;
      var scaleSpaceData = scaleSpace[octave][scale].data;
      i = width - 1;
      for (var y = 1; y < height - 1; y++) {
        i += 2;
        for (var x = 1; x < width - 1; x++) {
          dataX[i] = .5 * (scaleSpaceData[i - 1] - scaleSpaceData[i + 1]);
          dataY[i] = .5 * (scaleSpaceData[i - width] - scaleSpaceData[i + width]);
          i++;
        }
      }
    }
  }
}

function computeReferenceOrientations (points) {
  var result = [];
  points.forEach(function (point) {
    var octave = point.octave;
    var scale = point.scale;
    var sigma = point.sigma;
    var x = point.x;
    var y = point.y;
    var diam = 3 * lambdaOri * sigma;
    if (x >= diam && x < imageWidth - diam &&
        y >= diam && y < imageHeight - diam) {
      var hist = new Array(numberOfBinsGrad).fill(0);
      var deltaOct = delta(octave);
      var mFrom = Math.round((x - diam) / deltaOct);
      var mTo = Math.round((x + diam) / deltaOct);
      var nFrom = Math.round((y - diam) / deltaOct);
      var nTo = Math.round((y + diam) / deltaOct);
      var denom = 2 * lambdaOri * lambdaOri * sigma * sigma;
      var binFactor = numberOfBinsGrad / twoPi;
      for (var m = mFrom; m <= mTo; m++)
        for (var n = nFrom; n <= nTo; n++) {
          var xPartial = partialX[octave][scale].aref(m, n);
          var yPartial = partialY[octave][scale].aref(m, n); 
          hist[Math.round(binFactor * atan2(yPartial, xPartial)) % numberOfBinsGrad]
            += Math.exp(-normSquared(m * deltaOct - x, n * deltaOct - y) / denom) * norm(xPartial, yPartial);
        }
      var histSmooth = convolveCircular(smoothKernel, hist, 6);
      var hMax = Math.max.apply(null, histSmooth);
      for (var i = 0; i < numberOfBinsGrad; i++) {
        var val = histSmooth[i];
        var valPlus = histSmooth[mod(i + 1, numberOfBinsGrad)];
        var valMinus = histSmooth[mod(i - 1, numberOfBinsGrad)];
        if (val > valMinus && val > valPlus && val >= 0.8 * hMax) {
          var orientation = (i + .5 * (valMinus - valPlus) / (valMinus - 2 * val + valPlus)) / binFactor;
          result.push({
            octave: point.octave,
            scale: point.scale,
            xIndex: point.xIndex,
            yIndex: point.yIndex,
            sigma: point.sigma,
            x: point.x,
            y: point.y,
            omega: point.omega,
            histogram: histSmooth,
            orientation: orientation
          });
        }
      }
    }
  });
  return result;
}

function computeDescriptors (points) {
  var result = [];
  points.forEach(function (point) {
    var octave = point.octave;
    var scale = point.scale;
    var sigma = point.sigma;
    var x = point.x;
    var y = point.y;
    var theta = point.orientation;
    var cos = Math.cos(theta);
    var sin = Math.sin(theta);
    var diam = Math.sqrt(2) * lambdaDescr * sigma;
    if (x >= diam && x < imageWidth - diam &&
        y >= diam && y < imageHeight - diam) {
      var hist = new Cube(numberOfHistograms, numberOfHistograms, numberOfBinsDescr, 0);
      var deltaOct = delta(octave);
      var binScale = (numberOfBinsDescr + 1) / numberOfBinsDescr;
      var mFrom = Math.round((x - binScale * diam) / deltaOct);
      var mTo = Math.round((x + binScale * diam) / deltaOct);
      var nFrom = Math.round((y - binScale * diam) / deltaOct);
      var nTo = Math.round((y + binScale * diam) / deltaOct);
      var denom = 2 * lambdaDescr * lambdaDescr * sigma * sigma;
      var lambdaFactor = 2 * lambdaDescr / numberOfHistograms;
      var thetaFactor = twoPi / numberOfBinsDescr;
      for (var m = mFrom; m <= mTo; m++)
        for (var n = nFrom; n <= nTo; n++) {
          var xNormal = ((m * deltaOct - x) * cos + (n * deltaOct - y) * sin) / sigma;
          if (Math.abs(xNormal) < lambdaDescr * binScale) {
            var yNormal = ((n * deltaOct - y) * cos - (m * deltaOct - x) * sin) / sigma;
            if (Math.abs(yNormal) < lambdaDescr * binScale) {
              var xPartial = partialX[octave][scale].aref(m, n);
              var yPartial = partialY[octave][scale].aref(m, n);
              var thetaNormal = mod2Pi(atan2(yPartial, xPartial) - theta);
              var contrib = Math.exp(-normSquared(m * deltaOct - x, n * deltaOct - y) / denom) * norm(xPartial, yPartial);
              for (var i = 1; i <= numberOfHistograms; i++) {
                var iFactor = 1 - Math.abs(xNormal - (i - .5 * (1 + numberOfHistograms)) * lambdaFactor) / lambdaFactor;
                if (iFactor >= 0) {
                  for (var j = 1; j <= numberOfHistograms; j++) {
                    var jFactor = 1 - Math.abs(yNormal - (j - .5 * (1 + numberOfHistograms)) * lambdaFactor) / lambdaFactor;
                    if (jFactor >= 0) {
                      for (var k = 1; k <= numberOfBinsDescr; k++) {
                        var kFactor = 1 - Math.abs((k - 1) * thetaFactor - thetaNormal) / thetaFactor;
                        if (kFactor >= 0) {
                          hist.incf(i - 1, j - 1, k - 1, iFactor * jFactor * kFactor * contrib);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

      var histNorm = hist.norm();
      for (var L = 0; L < hist.length; L ++) {
        hist.data[L] = Math.min(255, Math.floor(512 * Math.min(hist.data[L], 0.2 * histNorm) / histNorm));
      }
      point.descriptor = hist;
      result.push(point);
    }
  });
  return result;
}

window.onload = init;
function sigma (octave, scale) {
  return Math.pow(2, octave - 1) * sigmaMin * Math.pow(2, scale / numberOfScales);
}

var headSize = 10;

function drawArrow (context, pointFrom, pointTo, color, lineWidth) {
  var angle = Math.atan2(pointTo[1] - pointFrom[1], pointTo[0] - pointFrom[0]);
  context.beginPath();
  context.lineWidth = lineWidth || 3.5;
  context.moveTo(pointFrom[0], pointFrom[1]);
  context.lineTo(pointTo[0], pointTo[1]);
  context.lineTo(pointTo[0] - headSize * Math.cos(angle - Math.PI/6),
                 pointTo[1] - headSize * Math.sin(angle - Math.PI/6));
  context.lineTo(pointTo[0], pointTo[1]);
  context.lineTo(pointTo[0] - headSize * Math.cos(angle + Math.PI/6),
                 pointTo[1] - headSize * Math.sin(angle + Math.PI/6));
  context.strokeStyle = color;
  context.stroke();
}

function showGrayScale (canvas, grayScaleStart, minMax, n) {
  n = n || 2;
  context = canvas.getContext("2d");

  var x = 0.5 * (canvas.width - grayScaleWidth);
  var grad = context.createLinearGradient(x, 0, x + grayScaleWidth, 0);
  grad.addColorStop(0, "black");
  grad.addColorStop(1, "white");
  
  context.beginPath();
  context.fillStyle = grad;
  context.fillRect(x, grayScaleStart, grayScaleWidth, 2 * margin);
  
  context.beginPath();
  context.fillStyle = "black";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(formatNumber(minMax[0], n), x - (3 * (n - 2) + (minMax[0] < 0 ? 20 : 17)), grayScaleStart + margin);
  
  context.beginPath();
  context.fillStyle = "black";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(formatNumber(minMax[1], n), x + (17 + 3 * (n - 2)) + grayScaleWidth, grayScaleStart + margin);

  if (minMax[0] < 0 && minMax[1] > 0) {
    x += grayScaleWidth * (- minMax[0] / (minMax[1] - minMax[0]));
    context.beginPath();
    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.rect(x - 1, grayScaleStart - 1, 2, 2 * margin + 2);
    context.stroke();
  }
}

function clearHistograms () {
  var canvas = d3.select("#Histograms").node();
  canvas.width = numberOfHistograms * numberOfBinsDescr * binWidth + 2 * margin;
  canvas.height = canvas.width;
  var context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPie (hist) {
  var max = -1;
  for (var i = 0; i < hist.length; i++)
    if (hist[i] > max)
      max = hist[i];

  var pieCanvas = d3.select("#Pie").node();
  var context = pieCanvas.getContext("2d");
  var center = pieCanvas.width / 2;
  var radius = pieCanvas.width / 2 - margin;
  var part = twoPi / numberOfBinsGrad;
  for (i = 0; i < numberOfBinsGrad; i++) {
    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, i * part, (i  + 1) * part);
    context.lineTo(center, center);
    context.strokeStyle = "black";
    context.fillStyle = i % 2 == 0 ? "#eeeeee" : "#dddddd";
    context.fill();

    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius * hist[i] / max, i * part, (i  + 1) * part);
    context.lineTo(center, center);
    context.fillStyle = colors[i % 9 + 4];
    context.fill();
  }
}

function clearPie () {
  var refCanvas = d3.select("#ReferenceExplain").node();
  var pieCanvas = d3.select("#Pie").node();
  pieCanvas.width = refCanvas.width;
  pieCanvas.height = refCanvas.width;
  var context = pieCanvas.getContext("2d");
  context.clearRect(0, 0, pieCanvas.width, pieCanvas.height);
}

function showHistograms (descriptor) {
  clearHistograms();
  var step = numberOfBinsDescr * binWidth;
  var canvas = d3.select("#Histograms").node();
  var context = canvas.getContext("2d");
  var c = 0;
  var x = margin;
  for (i = 0; i < numberOfHistograms; i++) {
    var y = canvas.height - margin;
    for (var j = 0; j < numberOfHistograms; j++) {
      for (var k = 0; k < numberOfBinsDescr; k++) {
        var h = descriptor.aref(i, j, k) / 255 * step;
        context.beginPath();
        context.fillStyle = colors[c];
        context.fillRect(x + k * binWidth, y - h, binWidth, h);
      }
      c++;
      y -= step;
    }
    x += step;
  }
}

