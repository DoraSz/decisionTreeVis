/*
    Return matrix of all principle components as column vectors
*/
function pca(X) {

	var n = X.length;

    // compute covariance matrix
    var sigma = numeric.div(numeric.dot(numeric.transpose(X), X), n-1);

	// compute the svd on the covariance matrix
	// S: eigenvalues on the diagonal, U, V: martix of eigenvectors
	return numeric.svd(sigma).V;
}

/*
    Return matrix of k first principle components as column vectors
*/
function pcaReduce(V, k) {
    return V.map(function(row) {
        return row.slice(0, k)
    });
}

/*
    Return matrix of k last principle components as column vectors
*/
function pcaReduceminVariance(V, k) {
		dim = numeric.dim(V[0]);
    return V.map(function(row) {
        return row.slice(dim-k, dim)
    });
}
/*
    Project matrix X onto reduced principle components matrix
*/
function pcaProject(X, V_reduce) {
    return numeric.dot(X, V_reduce);
}

/*
    Recover matrix from projection onto reduced principle components
*/
function pcaRecover(X, Vreduce, mean) {

    //return numeric.addeq(numeric.dot(X, numeric.transpose(Vreduce)),mean);
}
/*
	Center the data
*/
function centerData(X) {
	var n = X.length;
	var mean = [];
	var X_T;

	// compute the mean-vector of X
	for (var row in X_T = numeric.transpose(X)) {
		mean.push(numeric.sum(X_T[row])/n);
	}

	Xcentered = []
	// center data (subtract mean from X)
	for (row in X) {
		Xcentered.push(numeric.sub(X[row], mean));
	}
	return {'data': Xcentered, 'mean': mean};
}

/* compact call for numeric.prettyprint */ 
function show(it) {
	console.log(numeric.prettyPrint(it));
}

/* Compute the eucledian distance between 2 points */ 
function euclediandistance(p,q) {
	if (p.length == 2 && q.length == 2) {
		return Math.sqrt(Math.pow((p[0] - q[0]), 2) + Math.pow((p[1] - q[1]), 2))
	}
}

function minpair(points1, points2) {
	var min = [points1[0],points2[0]];
	for (p in points1) {
		for (pt in points2) {
			var distance = euclediandistance(points1[p], points2[pt]);
			if (distance < euclediandistance(min[0], min[1])) {
				min = [points1[p], points2[pt]];
			} 
		}
	}
	return min;
}
