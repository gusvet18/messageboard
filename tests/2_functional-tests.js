const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
    // for reporting and deletion testing
    let threadId;
    const threadDeletePass = "thread_delete";
    let replyId;
    const replyDeletePass = "delete_reply";

    test('Creating a new thread: POST request to /api/threads/{board}', function (done) {
        chai
            .request(server)
            .post('/api/threads/tests')
            .send({ text: "test text", delete_password: threadDeletePass })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                chai
                    .request(server)
                    .get('/api/threads/tests')
                    .end(function (err, res) {
                        assert.equal(res.status, 200);
                        assert.isArray(res.body);
                        assert.exists(res.body[0])
                        const thread = res.body[0];
                        assert.property(thread, '_id');
                        assert.property(thread, 'text');
                        assert.equal(thread.text, 'test text');
                        assert.property(thread, 'created_on');
                        assert.property(thread, 'bumped_on');
                        assert.property(thread, 'replies');
                        threadId = thread._id; // for reporting and deletion testing
                        done();
                    });
            });

    });

    test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
        chai
            .request(server)
            .get('/api/threads/tests')
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.isArray(res.body)
                assert.isAtMost(res.body.length, 10);
                for (let thread of res.body) {
                    assert.isAtMost(thread.replies.length, 3);
                }
                done();
            });
    });

    test('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
        chai
            .request(server)
            .put('/api/threads/tests')
            .send({ report_id: threadId })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, "reported");
                done();
            });
    });

    test('Creating a new reply: POST request to /api/replies/{board}', function (done) {
        chai
            .request(server)
            .post('/api/replies/tests')
            .send({ text: "test text", thread_id: threadId, delete_password: replyDeletePass })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                chai
                    .request(server)
                    .get(`/api/replies/tests?thread_id=${threadId}`)
                    .end(function (err, res) {
                        assert.isObject(res.body);
                        assert.exists(res.body.replies[0])
                        const reply = res.body.replies[0];
                        assert.isObject(reply);
                        assert.property(reply, '_id');
                        assert.property(reply, 'text');
                        assert.equal(reply.text, 'test text');
                        assert.property(reply, 'created_on');
                        replyId = reply._id; // for reporting and deletion testing
                        done();
                    });
            });
    });

    test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
        chai
            .request(server)
            .get(`/api/replies/tests?thread_id=${threadId}`)
            .end(function (err, res) {
                assert.equal(res.status, 200);
                const thread = res.body;
                assert.isObject(res.body)
                assert.property(thread, '_id');
                assert.property(thread, "text");
                assert.property(thread, "replies")
                const reply = thread.replies[0];
                assert.isObject(reply);
                assert.property(reply, '_id');
                assert.property(reply, 'text');
                assert.equal(reply.text, 'test text');
                assert.property(reply, 'created_on');
                done();
            });
    });

    test('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
        chai
            .request(server)
            .put('/api/replies/tests')
            .send({ thread_id: threadId, reply_id: replyId })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, "reported");
                done();
            });
    });

    test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function (done) {
        chai
            .request(server)
            .delete(`/api/replies/tests?thread_id=${threadId}`)
            .send({ thread_id: threadId, reply_id: replyId, delete_password: "bad password" })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, "incorrect password");
                done();
            });
    });

    test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with an invalid delete_password', function (done) {
        chai
            .request(server)
            .delete(`/api/replies/tests?thread_id=${threadId}`)
            .send({ thread_id: threadId, reply_id: replyId, delete_password: replyDeletePass })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, "success");
                done();
            });
    });

    test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function (done) {
        chai
            .request(server)
            .delete('/api/threads/tests')
            .send({ thread_id: threadId, delete_password: "bad password" })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, "incorrect password");
                done();
            });
    });

    test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with an invalid delete_password', function (done) {
        chai
            .request(server)
            .delete('/api/threads/tests')
            .send({ thread_id: threadId, delete_password: threadDeletePass })
            .end(function (err, res) {
                assert.equal(res.status, 200);
                assert.equal(res.text, "success");
                done();
            });
    });

    //Reloads the page after it crashes when finishing the tests
    //This is necessary because Replit is bugged
    after(function () {
        chai.request(server)
            .get('/')
    });
});