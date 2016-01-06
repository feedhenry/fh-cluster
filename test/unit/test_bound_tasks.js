var sinon = require('sinon');
var boundTasks = require('../../lib/bound_tasks');
var assert = require('assert');
var _ = require('lodash');


function createMockTask(preferredWorkerId, startEventId){
  return {
    preferredWorkerId: preferredWorkerId,
    workerFunction: sinon.spy(),
    startEventId: startEventId
  };
}

function createWorkerSendStub(startEventId){
  var stub = sinon.stub();

  function assignSubValidArgs(startEventId){
    stub.withArgs(sinon.match({
        startEventId: startEventId
      }))
      .returns(true);
  }

  if(_.isArray(startEventId)){
    _.each(startEventId, assignSubValidArgs);
  } else {
    assignSubValidArgs(startEventId);
  }


  stub.throws("Invalid Parameters ");

  return stub;
}

function createMockWorker(id, sendStub, state){
  return {
    send: sendStub,
    id: id,
    state: state
  };
}

describe('Bound Tasks', function() {
  describe('Single Task', function(){
    var START_EVENT_ID = "somestartevent1";
    it('No Workers', function (done) {
      var mockTask = createMockTask(1, START_EVENT_ID);

      var worker1SendStub = createWorkerSendStub(START_EVENT_ID);
      var cluster = {
      };

      var singleBoundTasks = [mockTask];

      boundTasks.setUpBoundTasks(singleBoundTasks, cluster);

      sinon.assert.notCalled(worker1SendStub);

      done();
    });

    it('Single Task Worker Not Assigned', function (done) {
      var mockTask = createMockTask(1, START_EVENT_ID);

      var worker1SendStub = createWorkerSendStub(START_EVENT_ID);
      var mockWorker = createMockWorker(1, worker1SendStub, 'listening');

      var cluster = {
        workers: {
          1: mockWorker
        }
      };

      var singleBoundTasks = [mockTask];

      boundTasks.setUpBoundTasks(singleBoundTasks, cluster);

      sinon.assert.calledOnce(worker1SendStub);
      assert.strictEqual(singleBoundTasks[0].worker, mockWorker);

      done();
    });

    it('Single Task Worker Assigned And Alive', function (done) {

      var mockTask = createMockTask(1, START_EVENT_ID);

      var worker1SendStub = createWorkerSendStub(START_EVENT_ID);
      var mockWorker = createMockWorker(1, worker1SendStub, 'listening');

      mockTask.worker = mockWorker;

      var cluster = {
        workers: {
          1: mockWorker
        }
      };

      var singleBoundTasks = [mockTask];

      boundTasks.setUpBoundTasks(singleBoundTasks, cluster);

      //Should not send the message when it is already assigned.
      sinon.assert.notCalled(worker1SendStub);
      assert.strictEqual(singleBoundTasks[0].worker, mockWorker);

      done();
    });

    it('Single Task Worker Assigned And Dead Another Worker Available', function (done) {
      var mockTask = createMockTask(1, START_EVENT_ID);

      var worker1SendStub = createWorkerSendStub(START_EVENT_ID);
      var worker2SendStub = createWorkerSendStub(START_EVENT_ID);

      var mockWorker = createMockWorker(1, worker1SendStub, 'dead');
      var mockWorker2 = createMockWorker(2, worker2SendStub, 'listening');

      //Assigning The Dead Worker. Should Switch To The Alive Worker
      mockTask.worker = mockWorker;

      var cluster = {
        workers: {
          1: mockWorker,
          2: mockWorker2
        }
      };

      var singleBoundTasks = [mockTask];

      boundTasks.setUpBoundTasks(singleBoundTasks, cluster);

      //Should not send the message when it is already assigned.
      sinon.assert.notCalled(worker1SendStub);

      //Should Send The Message To The Alive Process.
      sinon.assert.calledOnce(worker2SendStub);
      //Worker 2 should be assigned to the task/
      assert.strictEqual(singleBoundTasks[0].worker, mockWorker2);

      done();
    });

    it('Single Task All Workers Dead', function (done) {
      var mockTask = createMockTask(1, START_EVENT_ID);

      var worker1SendStub = createWorkerSendStub(START_EVENT_ID);
      var worker2SendStub = createWorkerSendStub(START_EVENT_ID);

      var mockWorker = createMockWorker(1, worker1SendStub, 'dead');
      var mockWorker2 = createMockWorker(2, worker2SendStub, 'dead');

      //Assigning The Dead Worker. Should Switch To The Alive Worker
      mockTask.worker = mockWorker;

      var cluster = {
        workers: {
          1: mockWorker,
          2: mockWorker2
        }
      };

      var singleBoundTasks = [mockTask];

      boundTasks.setUpBoundTasks(singleBoundTasks, cluster);

      //Should not send the message when it is already assigned.
      sinon.assert.notCalled(worker1SendStub);

      //Should Send The Message To The Alive Process.
      sinon.assert.notCalled(worker2SendStub);
      //Worker 1 should still be assigned to the task
      assert.strictEqual(singleBoundTasks[0].worker, mockWorker);

      //Setting Worker 2 To listening
      mockWorker2.state = 'listening';

      boundTasks.setUpBoundTasks(singleBoundTasks, cluster);

      sinon.assert.calledOnce(worker2SendStub);
      assert.strictEqual(singleBoundTasks[0].worker, mockWorker2);

      done();
    });
  });

  describe('Multiple Tasks', function(){
    var START_EVENT_ID_1 = "somestartevent1";
    var START_EVENT_ID_2 = "somestartevent2";

    it('Same Process', function(done){
      var mockTask = createMockTask(1, START_EVENT_ID_1);
      var mockTask2 = createMockTask(1, START_EVENT_ID_2);

      var worker1SendStub = createWorkerSendStub([START_EVENT_ID_1, START_EVENT_ID_2]);
      var mockWorker = createMockWorker(1, worker1SendStub, 'listening');

      var cluster = {
        workers: {
          1: mockWorker
        }
      };

      var singleBoundTasks = [mockTask, mockTask2];

      boundTasks.setUpBoundTasks(singleBoundTasks, cluster);

      sinon.assert.calledTwice(worker1SendStub);

      assert.strictEqual(singleBoundTasks[0].worker, mockWorker);
      assert.strictEqual(singleBoundTasks[1].worker, mockWorker);

      done();
    });

    it('Different Workers', function(done){
      var mockTask = createMockTask(1, START_EVENT_ID_1);
      var mockTask2 = createMockTask(2, START_EVENT_ID_2);

      var worker1SendStub = createWorkerSendStub([START_EVENT_ID_1]);
      var worker2SendStub = createWorkerSendStub([START_EVENT_ID_2]);
      var mockWorker1 = createMockWorker(1, worker1SendStub, 'listening');
      var mockWorker2 = createMockWorker(2, worker2SendStub, 'listening');

      var cluster = {
        workers: {
          1: mockWorker1,
          2: mockWorker2
        }
      };

      var singleBoundTasks = [mockTask, mockTask2];

      boundTasks.setUpBoundTasks(singleBoundTasks, cluster);

      sinon.assert.calledOnce(worker1SendStub);
      sinon.assert.calledOnce(worker2SendStub);

      assert.strictEqual(singleBoundTasks[0].worker, mockWorker1);
      assert.strictEqual(singleBoundTasks[1].worker, mockWorker2);

      done();
    });

    it('Only Non Working Tasks Should Be Moved', function(done){
      var mockTask = createMockTask(1, START_EVENT_ID_1);
      var mockTask2 = createMockTask(2, START_EVENT_ID_2);

      var worker1SendStub = createWorkerSendStub([START_EVENT_ID_2]);
      var worker2SendStub = createWorkerSendStub([START_EVENT_ID_2]);
      var mockWorker1 = createMockWorker(1, worker1SendStub, 'listening');
      var mockWorker2 = createMockWorker(2, worker2SendStub, 'dead');

      mockTask.worker = mockWorker1;
      mockTask2.worker = mockWorker2;

      var cluster = {
        workers: {
          1: mockWorker1,
          2: mockWorker2
        }
      };

      var singleBoundTasks = [mockTask, mockTask2];

      boundTasks.setUpBoundTasks(singleBoundTasks, cluster);

      sinon.assert.notCalled(worker2SendStub);
      sinon.assert.calledOnce(worker1SendStub);

      assert.strictEqual(singleBoundTasks[0].worker, mockWorker1);
      assert.strictEqual(singleBoundTasks[1].worker, mockWorker1);

      done();
    });
  });
});