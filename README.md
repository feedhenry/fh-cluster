## fh-cluster

Wraps node cluster module to allow cleaner usage

### Install

```shell
npm install fh-cluster --save
```

### Usage

Import the module, pass your application entrypoint function to it:

```javascript
var express = require('express');
var fhcluster = require('fh-cluster');

function exampleApp(clusterWorker) {

  var app = express();
  app.get('/', function(req, res) {
    res.status(200).send('hello from worker #' + clusterWorker.id + '\n');
  });

  app.listen(8081);
}

var numWorkers = 4;
fhcluster(exampleApp, numWorkers);
```
