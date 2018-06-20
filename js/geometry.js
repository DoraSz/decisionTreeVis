var epsilon = 5.96e-08;

/* convert 2 points to a line in form A
return: {A,B,C}
*/
function pointstoline(point1, point2) {
    var a = (point2[1]-point1[1]);
    var b = (point1[0]-point2[0]);
    return {'A': a,
            'B': b,
            'C': (a*point1[0]+b*point1[1])
          };
}

/* compute the intersection point between two lines*/
function lineintersection(line1, line2) {
  // A1*B2 - A2*B1
  det = line1.A*line2.B - line2.A*line1.B;
  if (det == 0) {
    // parallel lines
    return null;
  } else {
    // (B2*C1-B1*C2)/det
    x = (line2.B*line1.C - line1.B*line2.C)/det;
    // (A1*C2-A2*C1)/det
    y = (line1.A*line2.C - line2.A*line1.C)/det;
  }
  return {'x': x, 'y': y};
}

/* finds 2 points where the line cuts its borders and returns those 2 points */
function findcuts(linepoints, borders) {
  // compute line from the PCA-points (returns A,B,C)
  var pcaline = pointstoline(linepoints[0], linepoints[1]);
  var borderline, cutpoint;
  var finalcuts = [];
  // object containing the 2 new border-point sets
  var newborder = {a: [], b: []};
  // 1 for border a, -1 for b
  var borderside = 1;

  loop1:
  for (var i = 0; (i < borders.length); i++) {
    // take 2 neighboring border poits and compute a line between them with pointstoline
    if (i == borders.length-1) {
      b1 = borders[i],
      b2 = borders[0];
    } else {
      b1 = borders[i];
      b2 = borders[i+1];
    }
    // save borderpoint
    if (borderside === 1) {
      newborder.a.push(borders[i]);
    } else {
      newborder.b.push(borders[i]);
    }

    borderline = pointstoline(b1, b2);
    // compute lineintersection
    var cutpoint = lineintersection(pcaline, borderline);

    if (!cutpoint) {continue loop1;}

    // compute if intersectionpoint is between the points
    if ((cutpoint.x <= Math.max(b1[0], b2[0])+epsilon) && (cutpoint.y <= Math.max(b1[1], b2[1])+epsilon) &&
        (cutpoint.x >= Math.min(b1[0], b2[0])-epsilon) && (cutpoint.y >= Math.min(b1[1], b2[1])-epsilon)) {

          var point = [cutpoint.x, cutpoint.y];

          // SPECIAL CASE: CUT IS DIRECTLY ON THE BORDER POINT: if (finalcuts.includes(point)) {continue;}
          // more precise check because of rounding errors
          loop2:
          for (var c in finalcuts) {
            if ((Math.abs(finalcuts[c][0]-cutpoint.x) < epsilon) && (Math.abs(finalcuts[c][1]-cutpoint.y) < epsilon)) {
              continue loop1;
            }
          }

          // add new borderpoint and switch to the other border set
          newborder.a.push(point);
          newborder.b.push(point);
          borderside *= -1;
          finalcuts.push(point);
    }
  }
  return {'cuts' : finalcuts, 'borders': newborder};
}

// calculate if a point is on a line defined by 2 other points (not necessarily between the points)
function pointOnLine(linepoints, point) {
		var epsilon = 5.96e-08;
		// distAC + dist BC = dist AB
		if (Math.abs(euclediandistance(linepoints[0], point) + (euclediandistance(point, linepoints[1]) - euclediandistance(linepoints[0], linepoints[0]))) < epsilon) {return true;}
		// distAB + dist BC = dist AC
		if (Math.abs(euclediandistance(linepoints[0], linepoints[1]) + (euclediandistance(linepoints[1], point) - euclediandistance(linepoints[0], point))) < epsilon) {return true;}
		// distAB + dist AC = dist BC
		if (Math.abs(euclediandistance(linepoints[0], linepoints[1]) + (euclediandistance(linepoints[0], point) - euclediandistance(linepoints[1], point))) < epsilon) {return true;}
		return false;
}
