// read csv file and convert into a matrix, convert every field into a number, non-number fields are converted to 0
d3.csv("./data/dataset.csv")
	.row(function(d) {
		dimensions = Object.keys(d);
		// for each row of the data convert strings to numbers (and NaN to 0)
		return Object.keys(d).map(function(f) {if (isNaN(+d[f])) {return 0;} else {return +d[f];}});
	})
	.get(function(error, csv) {
		if (error) throw error;

		// read json file with decision tree
		d3.json("./data/decisiontree.json", function(error, tree) { 
  			if (error) throw error
			
				//preprocess tree
				DFS_pre(tree, csv, 0);
			
				// add event listeners to the buttons
				document.getElementById("directionButton").addEventListener("click", redraw);
				document.getElementById("shiftingButton").addEventListener("click", showGreyLines);
				document.getElementById("animationButton").addEventListener("click", movePoints);

				csv = DFS_presort(tree, csv, []);

				/************ PCA *************/
			  	var centered = centerData(csv);
				var mean = centered.mean;
				// do pca
				var PCA = pca(centered.data);
				// reduce to 2 dimensions (pcareduced - the pca-matrix for 2 dimensions)
				var pcareduced = pcaReduce(PCA, 2);
				// project data
				var dataset = pcaProject(centered.data, pcareduced);
				//origdataset = dataset.slice(0);

				// compute the minimum and maximum values of the orinial dataset
				var x_extrema_original = d3.extent(dataset, function(d) { return d[0]; });
				var y_extrema_original = d3.extent(dataset, function(d) { return d[1]; });
				var orig_borders = [[x_extrema_original[0]-10, y_extrema_original[1]*100],
									[x_extrema_original[1]*100, y_extrema_original[1]*100],
									[x_extrema_original[1]*100, y_extrema_original[0]-10],
									[x_extrema_original[0]-10, y_extrema_original[0]-10]];

				/************* Eliminate overlaps and calculate the new points ****************/
				var distorteddata = DFS_distort(csv,tree,45);

				calculateOverallDistortion();
				
				function calculateOverallDistortion() {
					var PCADistortion = calculateDistortion(dataset)
					var VIZdistortion = calculateDistortion(distorteddata)
					var distortionValue = (VIZdistortion-PCADistortion).toFixed(3);
					var distortionPercent = ((VIZdistortion/PCADistortion) * 100 -100).toFixed(3);
					document.getElementById("distortionValue").innerHTML = distortionValue + ', +' + distortionPercent + '%';
				}
		

				// update the tree, calculate and save the shifted datapoints in each node
				computedistortions(tree, 45);

				/************ Plot in  D3 *************/
				// Set the dimensions of the svg canvas
				var width = 400;
				var height = 400;
				var padding = 25;

				// Create svg canvasfor scatterplot
				var svg = d3.select("#content")
						.append("svg")
						.attr("width", width)
						.attr("height", height)
						.attr("id", "svg1");

				// minimum and maximum values of the x and y dimensions of the shifted data!
				var x_extrema = d3.extent(distorteddata.concat(dataset), function(d) { return d[0]; });
				var y_extrema = d3.extent(distorteddata.concat(dataset), function(d) { return d[1]; });


				// Scale to x and y axis
				var xScale = d3.scale.linear().domain(x_extrema).range([padding, width-padding]);
				var yScale = d3.scale.linear().domain(y_extrema).range([height-padding, padding]);

				// 4 border points of the starting coordinate system + some padding
				var b = [[x_extrema[0]-10, y_extrema[1]+10],[x_extrema[1]+10, y_extrema[1]+10],[x_extrema[1]+10, y_extrema[0]-10],[x_extrema[0]-10, y_extrema[0]-10]];

				// draw the lines with respect to the boundaries resulting from the cuts and plot the points
				DFS_draw(tree, b);
				// draw the grey lines that show how much the points were shifted
				DFS_drawShiftingLines(tree);
				// draw the axes of the scatterplot
				drawAxes();		
				// draw the tree visualization
				drawTree(tree);	

				// view is 1 if distorted points are shown, 0 if the pca points are shown
				distortedView = 1;

				function calculateDistortion(data) {
					distortionValue = 0; 
					for (i in data) {
						for (j in data) {
							distortionValue += euclediandistance(data[i],data[j])
						}
					}
					distortionValue = distortionValue / (2 * n_over_k(data.length,2));
					return distortionValue;
				}

				function n_over_k(n,k) {
					if ((typeof n !== 'number') || (typeof k !== 'number')) 
						return false; 
					var coeff = 1;
					for (var x = n-k+1; x <= n; x++) coeff *= x;
					for (x = 1; x <= k; x++) coeff /= x;
					return coeff;
				}

			// save data into the tree nodes
			function DFS_pre(node, data, DEPTH) {
				if (node.variable === "leaf") {
					node.data = data;
					node.variable = "leaf";
					return;
				}
				//show(node.variable + " : " + node.value)
				var databelow = [];
				var dataabove = [];
				variableindex = dimensions.indexOf(node.variable); 
				// split dataset
				for (line in data) {
					if (data[line][variableindex] < node.value) {
						databelow.push(data[line]);
					} else {
						dataabove.push(data[line]);
					}
				}
				var below = databelow.slice();
				var above = dataabove.slice();

				// make tree applicable to different datasets
				if (below.length == 0 || above.length == 0) {
					node.variable = "leaf";
					node.data = data;
					return;
				}
				//show(below);show(above);
				// recursive call
				DFS_pre(node.children[0], below, DEPTH+1);
				DFS_pre(node.children[1], above, DEPTH+1);
			}
				

				function DFS_presort(node, data, sortedData) {
					if (node.variable === "leaf") {
						sortedData = sortedData.concat(data);
						return sortedData;
					}
					var databelow = [];
					var dataabove = [];
					variableindex = dimensions.indexOf(node.variable); 
					// split dataset
					for (line in data) {
						if (data[line][variableindex] < node.value) {
							databelow.push(data[line]);
						} else {
							dataabove.push(data[line]);
						}
					}
					var below = databelow.slice();
					var above = dataabove.slice();
					// recursive call
					sortedData = DFS_presort(node.children[0], below, sortedData);
					sortedData = DFS_presort(node.children[1], above, sortedData);
					return sortedData;
				}

				// create new visualization after angle is changed by user
				function visualizeWithNewAngle(angle) {
					// shift data points
					distorteddata = DFS_distort(csv,tree,angle);
					// update the tree, calculate and save the shifted datapoints in each node
					computedistortions(tree, angle);
					// calculate new extrema
					var x_extrema = d3.extent(distorteddata.concat(dataset), function(d) { return d[0]; });
				    var y_extrema = d3.extent(distorteddata.concat(dataset), function(d) { return d[1]; });
					// recalculate d3 scales
					xScale = d3.scale.linear().domain(x_extrema).range([padding, width-padding]);
					yScale = d3.scale.linear().domain(y_extrema).range([height-padding, padding]);
					// recalculate starting borders
					b = [[x_extrema[0]-10, y_extrema[1]+10],[x_extrema[1]+10, y_extrema[1]+10],[x_extrema[1]+10, y_extrema[0]-10],[x_extrema[0]-10, y_extrema[0]-10]];

					// draw the lines and point the points
					DFS_draw(tree, b);
					// draw the grey lines that show how much the points were shifted
					DFS_drawShiftingLines(tree);
					// draw the axes
					drawAxes();		
					// draw the tree
					drawTree(tree);
					// set view to distorted
					distortedView = 1;
					//var distortionValue = calculateDistortion(distorteddata)-calculateDistortion(dataset);
					//document.getElementById("distortionValue").innerHTML = distortionValue;
					calculateOverallDistortion();
					// set animation button label back to default
					document.getElementById("animationButton").innerHTML = "Show PCA";
				}
	
				// Add the scatterplot				
				function scatterplot(data, color, radius, clss) {				
					svg.selectAll("dot")
					.data(data)
					.enter()
					.append("circle")
					.attr("r", radius)
					.attr("cx", function(d) { return xScale(d[0]);})
					.attr("cy", function(d) { return yScale(d[1]);})
					.attr("class", function(d){if (clss){return clss;}})
					.style("fill", color);
				}				

				// show/hide the grey from the original position of the points
				function showGreyLines() {
					var button = document.getElementById("shiftingButton");
					var lines = d3.selectAll(".distortions");
					if (lines.style("display") == "block") {
						lines.style("display", "none");
						button.innerHTML = "Show shifting lines";
					} else {
						lines.style("display", "block");
						button.innerHTML = "Hide shifting lines";
					}
				}
				

				// show/hide the grey from the original position of the points
				function movePoints() {
					var points = d3.selectAll(".dataPoints");
					var button = document.getElementById("animationButton");
					if (distortedView == 0) { // switch to distorted positions
						points.transition()
							.attr("duration", function(d,i) {return 10;})
							.attr("cx", function(d,i) {return xScale(distorteddata[i][0])})
							.attr("cy", function(d,i) {return yScale(distorteddata[i][1])}); 
						d3.selectAll(".distortions").transition()
									.attr("duration", function(d,i) {return 1000;})
									.style('opacity', 1.0);
						d3.selectAll(".line").transition()
									.attr("duration", function(d,i) {return 1000;})
									.style('opacity', 1.0);
						distortedView = 1;
						button.innerHTML = "Show PCA";
					} else {
						d3.selectAll(".distortions").style("opacity", 0.0); //switch to PCA positions 
						d3.selectAll(".line").style("opacity", 0.0); 
						points.transition()
							.attr("duration", function(d,i) {return 10;})
							.attr("cx", function(d,i) {return xScale(dataset[i][0])})
							.attr("cy", function(d,i) {return yScale(dataset[i][1])});;
						distortedView = 0;
						
						button.innerHTML = "Show distorted points";
					}
				} 

				d3.selectAll("circle")

				// angle changed, redraw the plot 
				function redraw() {
					var angle = document.getElementById("direction").value;
					// check if input is number 
					if (checkInput(angle)) {
						angle = Number(angle)
						// check if number in valid range
						if (angle < 0 || angle > 360) {
							alert("Must input positive integers between 0 and 360");
							return;
						}
						// delete existing svgs
						svg.selectAll("*").remove();
						d3.select("#treesvg").remove();
						document.getElementById("SVMaccuracy").innerHTML = " ";
						clearTree(tree);
						visualizeWithNewAngle(angle);				
					}
					return;
				}

				// check if the input is a number (only positiva numbers pass)
				function checkInput(x) {
					var regex=/^[0-9]+$/;
					if (!x.match(regex))
					{
						alert("Must input positive integers");
						return false;
					}
					return true;
				}
	
			/************ Plotting after PCA *************/
			// compute the pca projection of some points
			function translatePoints(points,mean) {
				var tmp = []
				// subtract mean
				for (var row in points) {
					tmp.push(numeric.sub(points[row], mean));
				}
				// projection with pca
				return pcaProject(tmp, pcareduced);
			}

			// draw the lines showing how much the points were shifted
			function DFS_drawShiftingLines(node) {
				if (node.variable === "leaf") {
					if (node.distortion != 0) {
						var cluster = translatePoints(node.data,mean);		
						for (var point in cluster) {
							drawline_simple([cluster[point], node.distorteddata[point]], "distortions");
						}
					}
					return;
				}
				DFS_drawShiftingLines(node.children[0]);
				DFS_drawShiftingLines(node.children[1]);				
			}

			// clear the tree before changing direction and computing the overlaps again
			function clearTree(node) {
	
				// delete the additional properties of the tree
				delete node.boundaries;
				delete node.line;
				delete node.distorteddata;
				delete node.distortion;
				delete node.depth;
				delete node.id;
				delete node.x;
				delete node.y;

				// iterate through the whole tree
				if (node.variable === "leaf") {
					return;
				} else {
					clearTree(node.children[0]);
					clearTree(node.children[1]);
				}
			}

			// eliminate overlaps and shift the points into a given direction (angle)
			function DFS_distort(csv, node, angle) {

				if (node.variable === "leaf") {
					if (node.data.length > 0) {
						var cluster = translatePoints(node.data,mean);				
					}
					return cluster;
				}
				
				var clusterbelow = DFS_distort(csv, node.children[0], angle);
				var clusterabove = DFS_distort(csv, node.children[1], angle);
				
				var hull_below = convexhull(clusterbelow);
				var hull_above = convexhull(clusterabove);

				if (clusterbelow.length < 3) {hull_below = clusterbelow;}
				if (clusterabove.length < 3) {hull_above = clusterabove;}
				var counter = 0;
				if (clusterbelow.length > 2 && clusterabove.length > 2) {
					var intersection = intersect(obj(hull_below), obj(hull_above));
					var min = minpair(hull_below, hull_above);
					var mindistance = euclediandistance(min[0], min[1]);
					while (intersection.length !== 0) {
						clusterabove = distort(clusterabove, mindistance, angle);
						hull_above = convexhull(clusterabove);
						intersection = intersect(obj(hull_below), obj(hull_above));
						counter += mindistance;
						if (intersection.length === 0) { // !==
							// check SVM result
							var svmline = separatebyline(hull_below, hull_above, orig_borders,{},true);
							var loopcount = 0;
							while (svmline.p.length == 0 || !acceptSVMresult(hull_below, svmline.b, svmline.p).acc || !acceptSVMresult(hull_above, svmline.b, svmline.p).acc || intersection.length !== 0) {
								clusterabove = distort(clusterabove, mindistance, angle);
								hull_above = convexhull(clusterabove);
								intersection = intersect(obj(hull_below), obj(hull_above));
								counter += mindistance;
								svmline = separatebyline(hull_below, hull_above, orig_borders,{},true);
								loopcount++;
								if (loopcount == 10) {
									break;
								}
							}
						}
					}
				} else { // special cases - no hull for 1 or 2 points
					var min = minpair(hull_below, hull_above);
					var mindistance = euclediandistance(min[0], min[1]);
					while (intersecting(hull_below, hull_above)) {
						clusterabove = distort(clusterabove, mindistance, angle);
						hull_above = convexhull(clusterabove);
						counter += mindistance;
						if (!intersecting(hull_below, hull_above)) {
							// check SVM result
							var svmline = separatebyline(hull_below, hull_above, orig_borders,{},true);
							var loopcount = 0;
							while (svmline.p.length == 0 || !acceptSVMresult(hull_below, svmline.b, svmline.p).acc || !acceptSVMresult(hull_above, svmline.b, svmline.p).acc || intersecting(hull_below, hull_above)) {
								clusterabove = distort(clusterabove, mindistance, angle);
								hull_above = convexhull(clusterabove);
								counter += mindistance;
								svmline = separatebyline(hull_below, hull_above, orig_borders,{},true);
								loopcount++;
								if (loopcount == 10) {
									break;
								}
							}
						}
					} 
				}


				// store the distortion in the points
				if (counter > 0) {
					updatedistortion(node.children[1], counter);
				}
				return clusterbelow.concat(clusterabove);
			}
	
			// store the distortions in the leaf nodes
			function updatedistortion(node, distortion) {
				if (node.variable === "leaf") {
					if (node.distortion !== undefined) {
						node.distortion += distortion;
					} else {
						node.distortion = distortion;
					}
					return;
				}
				updatedistortion(node.children[0], distortion);
				updatedistortion(node.children[1], distortion);			
			}

			// compute the distortions (saved in the leaf nodes) in each node
			function computedistortions(node, angle) {
				if (node.variable === "leaf") {
					if (node.distortion === undefined) {
						node.distortion = 0;
						node.distorteddata = translatePoints(node.data, mean);
					} else {
						var points = translatePoints(node.data, mean);
						node.distorteddata = distort(points, node.distortion, angle);
					}
					return;
				}
					
				computedistortions(node.children[0], angle);
				computedistortions(node.children[1], angle);
				node.distorteddata = (node.children[0].distorteddata).concat(node.children[1].distorteddata);
			}

			// draw the lines of the decision tree with respect to the borders		
			function DFS_draw(node, boundaries){
					
					// leaf reached, backtracking
					if (node.variable === "leaf") {
						// save polygon boundaries
						node.boundaries = boundaries;
						if (node.distorteddata.length > 0) {
							scatterplot(node.distorteddata, node.color, 2.5, "dataPoints");
						} else {
							throw Error("invalid cut in decision tree"); 
						}
						return;
					}

					node.boundaries = boundaries;

					var hull_below = convexhull(node.children[0].distorteddata);
					var hull_above = convexhull(node.children[1].distorteddata);

					if (hull_below.length == 0) {hull_below = node.children[0].distorteddata;}
					if (hull_above.length == 0) {hull_above = node.children[1].distorteddata;}
										
					//  calculate the first test line with svm
					var svmline = separatebyline(hull_below, hull_above, boundaries, node, true);

					var loopcount = 0;
					while (svmline.p.length == 0 || !acceptSVMresult(hull_below, svmline.b, svmline.p).acc || !acceptSVMresult(hull_above, svmline.b, svmline.p).acc) {
						svmline = separatebyline(hull_below, hull_above, boundaries, node, true);
						loopcount++;
						if (loopcount == 5) { 
							// svm failed after a given number of tries
							console.log("SVM fails at " + node.variable + " = " + node.value);
							
							// get the support vectors and calculate a correct line from them
							var supportvectors = svmline.sv;

							// place a line on the support vectors of class below
							if (supportvectors.sv_below.length == 2) {
								var polyside_below = supportvectors.sv_below;
								if (testSupportVector(polyside_below, boundaries, hull_below, hull_above, svmline)) {
									console.log("Support Vector of class below");
									break;
								}

								var mixedsupportvectors = [supportvectors.sv_below[0], supportvectors.sv_above[0]];
								if (testSupportVector(mixedsupportvectors, boundaries, hull_below, hull_above, svmline)) {
									console.log("Support Vector of classes");
									break;
								}
								mixedsupportvectors = [supportvectors.sv_below[1], supportvectors.sv_above[0]];
								if (testSupportVector(mixedsupportvectors, boundaries, hull_below, hull_above, svmline)) {
									break;
								}
							}
							// place a line on the support vectors of class above
							if (supportvectors.sv_above.length == 2) {
								var polyside_above = supportvectors.sv_above;							
								if (testSupportVector(polyside_above, boundaries, hull_below, hull_above, svmline)) {
									console.log("Support Vector of class above");
									break;
								}
								var mixedsupportvectors = [supportvectors.sv_above[1], supportvectors.sv_below[0]];
								
								var newboundaries = drawline(mixedsupportvectors,boundaries,true).b;
								if (testSupportVector(mixedsupportvectors, boundaries, hull_below, hull_above, svmline)) {
									break;
								}
							}

							console.log("Algorithm fails at " + node.variable + " = " + node.value);
							break;
						}
					}


					if (svmline.p.length > 0) {
						// draw line (false indicates it is not a test call)
						var result = drawline(svmline.p,boundaries,false);
						boundaries = result.b;
						node.line = result.p;
					} else {
						console.log("svm is null");
						return;
					}

					// check which border side belong to above/below
					var SVMacceptance = acceptSVMresult(hull_below, svmline.b, svmline.p);
					if (SVMacceptance.a_c > SVMacceptance.b_c) {
							DFS_draw(node.children[0], boundaries.a);
							DFS_draw(node.children[1], boundaries.b);
					} else {
							DFS_draw(node.children[0], boundaries.b);
							DFS_draw(node.children[1], boundaries.a);
					}
			}
			
			function testSupportVector(points, boundaries, hull_below, hull_above, svmline) {				
				var newboundaries = drawline(points,boundaries,true).b;
				if (acceptSVMresult(hull_below, newboundaries, points).acc && acceptSVMresult(hull_above, newboundaries, points).acc) {
					svmline.p = points;
					svmline.b = newboundaries;												
					return true;
				} else {
					return false;
				}
			}

			function acceptSVMresult(datapoints, boundaries, linepoints, vectors) {
				var a_counter = 0;
				var b_counter = 0;
				for (var d in datapoints) {
					if (vectors) {
						if (datapoints[d] == linepoints[0] || datapoints[d] == linepoints[1]) {
							a_counter++;
							b_counter++;
						}
						continue;
					}
					// datapoints in above
					if (findPointInsidePolygon(ob(datapoints[d]), obj(boundaries.a))) {
						a_counter++;
					// datapoints in below
					} else if (findPointInsidePolygon(ob(datapoints[d]), obj(boundaries.b))) {
						b_counter++;
					} else {
						// check if the data points lay exactly on the polygon border
						for (var b in boundaries.b) {
							if (pointOnLine([boundaries.b[b%boundaries.b.length], boundaries.b[(b+1)%boundaries.b.length]], datapoints[d])){
								b_counter++;
							}
						}
						for (var a in boundaries.a) {
							if (pointOnLine([boundaries.a[a%boundaries.a.length], boundaries.a[(a+1)%boundaries.a.length]], datapoints[d])){
								a_counter++;
							}
						}
					}
				}
				// every points is in the correct polygon
				if (a_counter == datapoints.length || b_counter == datapoints.length) {
					return {"acc": true, "a_c": a_counter, "b_c": b_counter};
				} 
				return {"acc": false, "a_c": a_counter, "b_c": b_counter};
			}

			
			// separate by line between linearly separable points with SVM
			function separatebyline(hull_below, hull_above, boundaries, node, test) {
				// join data
				var data = hull_below.concat(hull_above);
				// create labels for the classes
				var labels = Array.apply(null, Array(hull_below.length)).map(Number.prototype.valueOf,-1).concat(Array.apply(null, Array(hull_above.length)).map(Number.prototype.valueOf,1));
				// train svm
				svm = new svmjs.SVM();
				svm.train(data, labels, {C: Infinity, numpasses: 15, tol: 1e-5}); // C is a parameter to SVM (10000000.0)
				// get the SVM weight vector 
				wb= svm.getWeights();
				// compute the separating line from the weight vector
				xs = [-5,5];
				var ys = [0,0];
				ys[0]= (-wb.b - wb.w[0]*xs[0])/wb.w[1];
      			ys[1]= (-wb.b - wb.w[0]*xs[1])/wb.w[1]; 
				var p1 = [xs[0],ys[0]];
				var p2 = [xs[1],ys[1]]; 
				// calculate the 2 biggest support vectors for each class (points near the separating line)
				var supportvectors = getsupportvectors(hull_below, hull_above, svm.alpha);
				// calculate the borders resulting from the polygon clipping
				var drawing = drawline([p1,p2],boundaries,test);
				drawing.sv = supportvectors;
				node.line = drawing.p;
				return drawing;
			}

			// get the biggest support vectors
			function getsupportvectors(hull_below, hull_above, alpha) {

				// split the alphas regarding to class
				var alpha_below = alpha.slice(0, hull_below.length);
				var alpha_above = alpha.slice(hull_below.length);
				
				// get the biggest support vectors from both classes
				var sv1_below = Math.max.apply(Math, alpha_below);
				var sv1_above = Math.max.apply(Math, alpha_above);
				var sv_b1 = hull_below[alpha_below.indexOf(sv1_below)];
				var sv_a1 = hull_above[alpha_above.indexOf(sv1_above)]	
				// store them in an object
				var supportvectors = {"sv_below": [sv_b1], "sv_above": [sv_a1]};
				// check for other support vectors, store the second biggest one 
				if (hull_below.length > 1) {
					alpha_below[alpha_below.indexOf(sv1_below)] = -Infinity;
					var sv2_below = Math.max.apply(Math, alpha_below);
					sv2_below = hull_below[alpha_below.indexOf(sv2_below)];
					(supportvectors.sv_below).push(sv2_below);
				}
				if (hull_above.length > 1) {
					alpha_above[alpha_above.indexOf(sv1_above)] = -Infinity;
					var sv2_above = Math.max.apply(Math, alpha_above);
					sv2_above = hull_above[alpha_above.indexOf(sv2_above)];
					(supportvectors.sv_above).push(sv2_above);
				}
				return supportvectors;
			}

			// compute the shifted points
			function distort(points, mindistance, angle) {
				// hypotenuse
				var h = mindistance;
				// angle
				var alpha = toRadians(angle);
				// calculating the distances into x and y directions
				var yDistance = Math.sin(alpha) * h; 
				var xDistance = Math.cos(alpha) * h;
				// shifting every point
				for (var p in points) {
					points[p][0] = points[p][0] + xDistance;
					points[p][1] = points[p][1] + yDistance;
				}
				return points;
			}
		
			// switch between radian and degree values
			function toDegrees (angle) {
				return angle * (180 / Math.PI);
			}

			function toRadians (angle) {
				return angle * (Math.PI / 180);
			}

			// draw a line given 2 points, no calculation of the borders
			function drawline_simple(linepoints, clss) {

				// Define the line
				var line = d3.svg.line()
						.x(function(d,i) { return xScale(d[0]); })
						.y(function(d,i) { return yScale(d[1]); });

				// Add the valueline path.
				svg.append("path")
					 .attr("class", "line")
					 .attr("d", line(linepoints))
					 .attr("class", clss)
					 .attr("stroke", "black")
					 .attr("stroke-width", 4);
			}


			// draw the line given 2 points with respect to the containing polygon, calculate the resulting polygons (test = false indicates if the line has to be drawn)
			function drawline(linepoints, borders, test) {
	
				var newline	= findcuts(linepoints, borders);
				var linepoints = newline.cuts;
				var newborders = newline.borders;
			  
				if (test === false) {
				// Define the line
				var line = d3.svg.line()
					.x(function(d,i) { return xScale(d[0]); })
					.y(function(d,i) { return yScale(d[1]); });

				// Add the valueline path.
				svg.append("path")
				   .attr("class", "line")
				   .attr("d", line(linepoints))
				   .attr("stroke-width", 2)
				   .attr("shape-rendering", "geometricPrecision")
				   .attr("stroke", "black");
				}
				return {b: newborders, p: linepoints};
			}


		// calculate the convex hull of given points
		function convexhull(dataset) {
			var hull = d3.geom.hull(dataset);
			return hull;
		}

		// draw a polygon given a set of points
		function drawPolygon(hull) {
			if (hull.length > 0) {
				li = d3.svg.line()
					.interpolate("linear-closed")
					.x(function(d) {return xScale(d[0]);})
					.y(function(d) {return yScale(d[1]);}); //cardinal-closed
					
				svg.append("path")
					.attr("d", li(hull))
                    .attr("fill", "black")
					.attr("opacity", 0.15)
					.attr("class","visiblehull");
			}
		}

			/************ Draw Axes *************/
			// draw the axes of the scatterplot for component 1 and compontent 2
			function drawAxes() {
				// x axis
				var xAxis = d3.svg.axis()
								.scale(xScale)
								.orient('bottom')
								.ticks(2);
				// y axis
				var yAxis = d3.svg.axis()
								.scale(yScale)
								.orient("left")
								.ticks(2);
				// Add x axis
				svg.append('g')
					.attr("transform", "translate(0," + (height) + ")")
					.call(xAxis);
				// Add y Axis
					svg.append("g")
							.attr("transform", "translate("+(0)+",0)")
							.call(yAxis);
				// now add titles to the axes
				svg.append("text")
						.attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
						.attr("transform", "translate("+ (padding/2) +","+10+")")  // text is drawn off the screen top left, move down and out and rotate
						.text("C 2"); // Component 2
				svg.append("text")
						.attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
						.attr("transform", "translate("+ (19*width/20) +","+(height-(padding/3))+")")  // centre below axis
						.text("C1"); // Component 1

				d3.selectAll(".domain").attr("fill", "none").attr("stroke", "black").attr("stroke-width", 2);
			}
			
			// ************** Generate the tree diagram	 *****************
			// draw a tree graph
			function drawTree(tree) {
				// Create second svg canvas
				var svg2 = d3.select("#content2")
							.append("svg")
							.attr("width", 500)
							.attr("height", 800)
							.attr("id", function(d, i) { return "treesvg"})
							.append("g")
							.attr("transform", "translate(" + 50 + "," + 50 + ")");
			
					var treeData = [tree];

					var i = 0;
					var tree = d3.layout.tree()
						.size([height, width]);

						var diagonal = d3.svg.diagonal()
							.projection(function(d) { return [d.x, d.y]; }); //

					root = treeData[0];
					update(root);

					function update(source) {
						// Compute the new tree layout.
						var nodes = tree.nodes(root).reverse(),
						links = tree.links(nodes);

						// Normalize for fixed-depth.
						nodes.forEach(function(d) { d.y = d.depth * 120; });

						// Declare the nodesâ€¦
						var node = svg2.selectAll("g.node")
							.data(nodes, function(d) { return d.id || (d.id = ++i); });

						// Enter the nodes.
						var nodeEnter = node.enter().append("g")
							.attr("class", "node")
							.attr("transform", function(d) {
						return "translate(" + d.x + "," + d.y + ")"; }); //

						nodeEnter.append("circle")
							.attr("r", 12)
							.style("fill", function(d) {if (d.variable == "leaf") {return d.color;} else {return "white";}});

						nodeEnter.append("text")
							.attr("y", function(d) { //
							return d.children || d._children ? 20 : 20; }) //
							.attr("dy", ".35em")
							.attr("text-anchor","middle")
							.text(function(d) { if (d.variable != "leaf") {return " < " + d.value + " < ";}})
							.style("fill-opacity", 1);

						nodeEnter.append("text")
							 .attr("y", function(d) { //
								return d.children || d._children ? 0 : 0; }) //
							 .attr("dy", ".35em")
							 .attr("text-anchor","middle")
							 .text(function(d) { if (d.variable != "leaf") {return d.variable;} })
							 .style("fill-opacity", 1);

						nodeEnter.append("circle")
							.attr("r", 12)
							.style("fill", function(d) {if (d.variable == "leaf") {return d.color;} else {return "white";}})
							.style("opacity", function(d) {if (d.variable !== "leaf") {return 0;}})
							// event listener for mouseover on tree nodes
							.on("mouseover", function(d){if (distortedView == 1) { 
															drawPolygon(d.boundaries); 
															if (d.line) { // decision node
																drawline_simple(d.line, "visiblehull")
															} else { // data node
																scatterplot(d.distorteddata, d.color, 3.5, "visiblehull");
															}
														  }
														})
							// event listener for mouse-out on tree nodes
							.on("mouseout", function(d){if (distortedView == 1) { d3.selectAll(".visiblehull").remove(); } });

						// Declare the links
						var link = svg2.selectAll("path.link")
						.data(links, function(d) { return d.target.id; });

						// Enter the links.
						link.enter().insert("path", "g")
						.attr("class", "link")
						.attr("d", diagonal);
					}
			}
	});
});
