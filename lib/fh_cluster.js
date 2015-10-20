/*
 Copyright Red Hat, Inc., and individual contributors

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
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
  var backoffResetTimeout = resetBackoffResetTimeout(backoffStrategy);

  var numWorkers = _.find([optionalNumWorkers, os.cpus().length], isValidNumWorkers);

  setOnWorkerListeningHandler();
  setupOnExitBackOff(backoffStrategy, backoffResetTimeout);

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
    var host = address.address || address.addressType === 4 ? '0.0.0.0' : '::';
    var addr = host + ':' + address.port;
    console.log('Cluster worker',  worker.id, 'is now listening at', addr);
  });
}

function setupOnExitBackOff(strategy, backoffResetTimeout) {
  cluster.on('disconnect', function(worker) {
    if (cluster.isMaster) {
      var nextRetry = strategy.next();
      console.log('Worker #', worker.id, 'disconnected. Will retry in',
                  nextRetry, 'ms');

      setTimeout(function() {
        cluster.fork();
        resetBackoffResetTimeout(strategy, backoffResetTimeout);
      }, nextRetry);
    }
  });
}

function resetBackoffResetTimeout(backoffStrategy, timeout) {
  if (timeout) {
    clearTimeout(timeout);
  }

  return setTimeout(function() {
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
