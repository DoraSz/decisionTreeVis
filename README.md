# decisionTreeVis

This web-based application helps to visualize decision tree models on high-dimensional numerical datasets. The visualization method is based on a slightly distorted Principal Component Analysis, which enables the drawing of linear decision rules in 2D via SVM. You can read a paper on the details of the visualization method [here](https://www.researchgate.net/publication/329019886_Decision_Tree_Visualization_for_High-dimensional_Numerical_Data).

The visualization uses [D3](https://github.com/d3/d3), [NumericJS](http://www.numericjs.com), [JS-Intersect](https://github.com/vrd/js-intersect) and [SvmJS](https://github.com/karpathy/svmjs).

# Online Demo

A demo for the application is available [here](https://dorasz.github.io/decisionTreeVis/).

# Usage

In order to visualize your own dataset and decision tree model, use the files dataset.csv and decisiontree.json in the data folder.

Note that the decision tree has to be defined in the following format:

```
{ ''variable'': ''x'', ''value'' : 5, ''children'': [
  	{ ''variable'': ''y'', ''value'': 4.1, ''children'': [
		...
	]}, 
	{''variable'': ''z'', ''value'': 9, ''children'': [ 
    	... 
    ]} 
]} 
```

Make sure that the values of the "variable"-key correspond to a column labels in the header row of the CSV file. 

Define leaf nodes as

```
{"variable": "leaf", "color": "green"}
```

Add "color"-key to the leaf nodes to indicate different classes.

# Licence

Apache 2.0
