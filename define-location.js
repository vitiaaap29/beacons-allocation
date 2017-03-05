ko.bindingHandlers.numeric = {
    init: function (element, valueAccessor) {
        $(element).on("keydown", function (event) {
            // Allow: backspace, delete, tab, escape, and enter
            if (event.keyCode == 46 || event.keyCode == 8 || event.keyCode == 9 || event.keyCode == 27 || event.keyCode == 13 ||
                // Allow: Ctrl+A
                (event.keyCode == 65 && event.ctrlKey === true) ||
                // Allow: . ,
                (event.keyCode == 188 || event.keyCode == 190 || event.keyCode == 110) ||
                // Allow: home, end, left, right
                (event.keyCode >= 35 && event.keyCode <= 39)) {
                // let it happen, don't do anything
                return;
            }
            else {
                // Ensure that it is a number and stop the keypress
                if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105)) {
                    // event.preventDefault();

                }
            }
        });
    }
};

var START_RADIUS = 100;
var ALLOW_NOT_COVERAGE = 0.4;

function LocationParameters () {
    var self = this;
    self.roomWidth = ko.observable(600);
    self.roomHeight = ko.observable(500);
    self.signalRadius = ko.observable(START_RADIUS);
    self.gridStep = ko.observable(START_RADIUS * 2);
    self.allowNotCoverage = ko.observable(ALLOW_NOT_COVERAGE);

    self.recalulate = function () {
        do {
            self.gridStep(self.gridStep() - 1);
            var roomCorner = {x: 0, y: 0};
            var centersBeacons = drawGridAndCircles(container, self, roomCorner, parseInt(self.gridStep()));
            var roomSize = {width: parseInt(self.roomWidth()), height: parseInt(self.roomHeight())};
            drawRoom(container, roomSize.width, roomSize.height, roomCorner);
            var signalRadius = parseInt(self.signalRadius());
            var coverage = calculateCoverage(roomSize, signalRadius, centersBeacons);
        }while (coverage < 1 - self.allowNotCoverage());
    }
}

var params = new LocationParameters(); 
ko.applyBindings(params);

var width = 1000, height = 1000;
var container = d3.select("#room")
    .attr('width', width)
    .attr('height', height);
container.append('rect');

var roomCorner = {x: 0, y: 0};
drawGridAndCircles(container, params, roomCorner);
drawRoom(container, params.roomWidth(), params.roomHeight(), roomCorner);

function drawGridAndCircles (container, params, roomCorner, gridStep) {
    var signalRadius = params.signalRadius();
    gridStep = gridStep || (signalRadius * 2);
    var roomSize = {width: params.roomWidth(), height: params.roomHeight()};
    var startPoint = calculateStartBeaconPoint(signalRadius, roomCorner);
    drawGrid(container, roomSize, gridStep, startPoint);
    var centersBeacons = generateBeaconLocation(startPoint, roomSize,  gridStep, signalRadius);
    drawCircles(container, centersBeacons, signalRadius-1);
    return centersBeacons;
}

function drawRoom (cont, width, height, startPoint) {
    cont.attr('width', width + startPoint.x)
        .attr('height', height + startPoint.y);
    return cont.select('rect')
        .attr("x", startPoint.x)     // x position of the first end of the line
        .attr("y", startPoint.y)      // y position of the first end of the line
        .attr("width", startPoint.x + width)     // x position of the second end of the line
        .attr("height", startPoint.y + height)
        .attr('style', 'fill: rgba(0,0,0,0);stroke:black;stroke-width:3');
}

function drawGrid (cont, roomSize, gridWidth, offset) {
    cont.selectAll('.gridLine').remove();
    var width = roomSize.width;
    var height = roomSize.height;
    for (var yPos = offset.y; yPos < height; yPos += gridWidth) {
        drawLine(cont, {x: 0, y: yPos}, {x: 0 + width, y: yPos});
    }
    for (var xPos = offset.x; xPos < width; xPos += gridWidth) {
        drawLine(cont, {x: xPos, y: 0}, {x: xPos, y: 0 + height});
    }
}

function drawLine (holder, startPoint, endPoint) {
    //http://stackoverflow.com/a/25419566/2652540
    holder.append("line")          // attach a line
        .attr('class', 'gridLine')
        .style("stroke", "green")  // colour the line
        .attr("x1", startPoint.x)     // x position of the first end of the line
        .attr("y1", startPoint.y)      // y position of the first end of the line
        .attr("x2", endPoint.x)     // x position of the second end of the line
        .attr("y2", endPoint.y);
}

function drawCircles (cont, centes, radius) {
    cont.selectAll("circle").remove();
    cont.selectAll("circle")
        .data(centes)
        .enter().append("circle")
        .style("stroke", "red")
        .style("fill", "rgba(0,0,0,0)")
        .attr("r", radius)
        .attr("cx", function(d, i){
            return d.x;
        })
        .attr("cy", function (centrePoint) {
            return centrePoint.y;
        });
}

function generateBeaconLocation (startPoint, roomSize, stepBetweenBeacons, radius) {
    var locations = [];
    for (var xPos = startPoint.x; xPos < roomSize.width + radius; xPos += stepBetweenBeacons) {
        for (var yPos = startPoint.y; yPos < roomSize.height + radius; yPos += stepBetweenBeacons) {
            if (xPos > roomSize.width) {
                xPos = roomSize.width;
            }
            if (yPos > roomSize.height) {
                yPos = roomSize.height;
            }
            locations.push({x: xPos, y: yPos});
        }
    }

    return locations;
}

function calculateStartBeaconPoint (radius, roomCorner) {
    var squareFromTwo = Math.sqrt(2);
    var d = (squareFromTwo - 1) * radius / squareFromTwo;
    var deltaXy = radius - d;
    return {
        x: roomCorner.x + deltaXy, y: roomCorner.y + deltaXy
    };
}

// function placingBeacons(argument) {
//     // body...
// }

function calculateCoverage(roomSize, signalRadius, beaconsCenters) {
    var monterCarloPoints = getMonteCarloPoints(roomSize, signalRadius, 100);
    var fillingPoints = monterCarloPoints.filter(function (p) {
        return isFillPoit(p, beaconsCenters, signalRadius);
    });
    var coverage =  fillingPoints.length / monterCarloPoints.length;
    console.log(coverage);
    return coverage;
}

function getMonteCarloPoints(roomSize, signalRadius, countPointPerRadius) {
    var monterCarloPoints = [];
    var startPoint = {x: 0, y: 0};
    var step = signalRadius / countPointPerRadius;
    for (var x = startPoint.x; x < roomSize.width; x +=step) {
        for (var y = startPoint.y; y < roomSize.height; y += step) {
            var currentPoint = {x: x, y: y};
            monterCarloPoints.push(currentPoint);
        }
    }
    return monterCarloPoints;
}

function isFillPoit (point, centersBeacons, circleRadius) {
    return _.some(centersBeacons, function (center) {
        return isPointInsideCircle(center, circleRadius, point);
    });
}

function isPointInsideCircle(circleCentre, radius, point) {
    return square(point.x - circleCentre.x) + square(point.y - circleCentre.y) <= square(radius);
}

function square(number) {
    return number * number;
}