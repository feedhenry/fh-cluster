var backoff = require('backoff');
var cluster = require('cluster');
var os = require('os');
var _ = require('lodash');

module.exports = function fhCluster(workerFunc, optionalNumWorkers, optionalBackoffStrategy) {
  var defaultExponentialBackoffStrategy = new backoff.ExponentialStrategy({
    initialDelay: 500,
    maxDelay: 5000
  });
  var backoffStrategy = _.find([optionalBackoffStrategy, defaultExponentialBackoffStrategy], isValidBackoffStrategy);
  var backoffResetInterval = resetBackoffResetInterval(backoffStrategy);

  var numWorkers = _.find([optionalNumWorkers, os.cpus().length], isValidNumWorkers);

  setOnWorkerListeningHandler();
  setupOnExitBackOff(backoffStrategy, backoffResetInterval);

  start(workerFunc, numWorkers);
};

function start(workerFunc, numWorkers) {
  if (cluster.isMaster) {
    _.times(numWorkers, function() {
      cluster.fork();
    });
  } else {
    workerFunc(cluster.worker);
  }
}

function setOnWorkerListeningHandler() {
  cluster.on('listening', function(worker, address) {
    var addr = address.address + ':' + address.port;
    console.log('Cluster worker',  worker.id, 'is now listening at', addr);
  });
}

function setupOnExitBackOff(strategy, backoffResetInterval) {
  cluster.on('exit', function(worker, code, signal) {
    var nextRetry = strategy.next();
    setTimeout(function() {
      var reason = code || signal;
      console.log('Worker #', worker.id, 'died with', reason,
                  '. Will retry in', nextRetry, 'ms');

      cluster.fork();
      resetBackoffResetInterval(strategy, backoffResetInterval);
    }, nextRetry);
  });
}

function resetBackoffResetInterval(backoffStrategy, interval) {
  if (interval) {
    clearInterval(interval);
  }

  return setInterval(function() {
    backoffStrategy.reset();
  }, 60*60*1000);
}

function isValidNumWorkers(number) {
  return number && typeof number === 'number' && number > 0;
}

function isValidBackoffStrategy(strategy) {
  return strategy
    && _.includes(_.functions(strategy), 'next')
    && _.includes(_.functions(strategy), 'reset');
}
