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
var assert = require('assert');
var _ = require('lodash');
var os = require('os');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var chai = require("chai");

var cluster = {
  isMaster: true,
  isWorker: false,
  fork: function() {
    this.isMaster = false;
    this.isWorker = true;
    return this;
  },
  on: _.noop,
  worker: {
    on: _.noop
  }
};

sinon.spy(cluster, 'on');
sinon.spy(cluster, 'fork');

var fhcluster = proxyquire('../../lib/fh_cluster.js', { cluster: cluster });

function resetCluster() {
  cluster.isMaster = true;
  cluster.isWorker = false;
  cluster.on.reset();
  cluster.fork.reset();
}

describe('fh-cluster', function() {

  describe('With one worker', function() {

    before(resetCluster);

    it('should initially be cluster master', function(done) {
      assert(cluster.isMaster);
      done();
    });

    it('should not call app function as master', function(done) {
      fhcluster(function() {
        assert(false, 'App function called by cluster master');
      }, 1);
      done();
    });

    it('should have set a handler for cluster exit event', function(done) {
      sinon.assert.calledWith(cluster.on, sinon.match('exit'));
      done();
    });

    it('should have called cluster.fork', function(done) {
      sinon.assert.calledOnce(cluster.fork);
      done();
    });

    it('should be cluster worker', function(done) {
      assert(cluster.isWorker);
      done();
    });

    it('should call app function when cluster worker', function(done) {
      fhcluster(function() {
        assert(cluster.isWorker);
        done();
      }, 1);
    });
  });

  describe('With two workers', function() {

    before(resetCluster);

    it('should fork two workers', function(done) {
      fhcluster(_.noop, 2);
      sinon.assert.calledTwice(cluster.fork);
      done();
    });
  });

  describe('Not passing optional parameter for number of workers', function() {

    before(resetCluster);

    it('should fork once for each cpu core', function(done) {
      fhcluster(_.noop);
      sinon.assert.callCount(cluster.fork, os.cpus().length);
      done();
    });
  });

  describe('With number of workers that is NaN', function() {

    before(resetCluster);

    it('should fork once for each cpu core', function(done) {
      fhcluster(_.noop, 'eleventy');
      sinon.assert.callCount(cluster.fork, os.cpus().length);
      done();
    });
  });

  describe('With number of workers that is less than one', function() {
    before(resetCluster);

    it('should fork once for each cpu core', function(done) {
      fhcluster(_.noop, -4);
      sinon.assert.callCount(cluster.fork, os.cpus().length);
      done();
    });
  });

  describe('Bound Cluster Tasks', function(){

    beforeEach(resetCluster);

    it('Assigning A Single Task No Preferred Worker', function(done){

      var mockBoundWorkerFunction = sinon.spy();
      var mockWorkerFunction = sinon.spy();
      var testBoundWorker = {
        startEventId: 'someeventid',
        workerFunction: mockBoundWorkerFunction
      };

      chai.expect(function(){
        fhcluster(mockWorkerFunction, 2, [testBoundWorker]);
      }).to.throw(/preferredWorkerId/);

      done();
    });

    it('Assigning A Single Task Worker Not Number', function(done){

      var mockBoundWorkerFunction = sinon.spy();
      var mockWorkerFunction = sinon.spy();
      var testBoundWorker = {
        startEventId: 'someeventid',
        workerFunction: mockBoundWorkerFunction,
        preferredWorkerId: '1'
      };

      chai.expect(function(){
        fhcluster(mockWorkerFunction, 2, [testBoundWorker]);
      }).to.throw(/preferredWorkerId/);

      done();
    });

    it('Assigning A Single Task Worker Preferred Worker Out Of Bounds', function(done){

      var mockBoundWorkerFunction = sinon.spy();
      var mockWorkerFunction = sinon.spy();
      var testBoundWorker = {
        startEventId: 'someeventid',
        workerFunction: mockBoundWorkerFunction,
        preferredWorkerId: 3
      };

      chai.expect(function(){
        fhcluster(mockWorkerFunction, 2, [testBoundWorker]);
      }).to.throw(/preferredWorkerId/);

      done();
    });

    it('Assigning A Single Task Worker No Worker Function', function(done){

      var mockWorkerFunction = sinon.spy();
      var testBoundWorker = {
        startEventId: 'someeventid',
        preferredWorkerId: 1
      };

      chai.expect(function(){
        fhcluster(mockWorkerFunction, 2, [testBoundWorker]);
      }).to.throw(/workerFunction/);

      done();
    });

    it('Assigning A Single Task Worker No Start Event Id', function(done){

      var mockBoundWorkerFunction = sinon.spy();
      var mockWorkerFunction = sinon.spy();
      var testBoundWorker = {
        startEventId: '',
        workerFunction: mockBoundWorkerFunction,
        preferredWorkerId: 1
      };

      chai.expect(function(){
        fhcluster(mockWorkerFunction, 2, [testBoundWorker]);
      }).to.throw(/startEventId/);

      done();
    });
  });
});
