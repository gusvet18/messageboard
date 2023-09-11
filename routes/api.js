'use strict';
const mongoose = require('mongoose');
require('dotenv').config();
var xssFilters = require('xss-filters'); //for user input sanitizing

module.exports = function (app) {

  //connect to Mongoose and create schemas and model
  mongoose.connect("mongodb+srv://gus:123@cluster0.opvwf1j.mongodb.net/messageboard2?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true });
  const replySchema = new mongoose.Schema({
    text: { type: String, required: true },
    created_on: { type: Date, required: true },
    //reported and delete_password fields will not be retrieved by default
    reported: { type: Boolean, default: false, select: false },
    delete_password: { type: String, required: true, select: false }
  });
  const ThreadSchema = new mongoose.Schema({
    text: { type: String, required: true },
    created_on: { type: Date, required: true },
    bumped_on: { type: Date, required: true },
    replies: {
      type: [replySchema],
      default: []
    },
    //reported and delete_password fields will not be retrieved by default
    reported: { type: Boolean, default: false, select: false },
    delete_password: { type: String, required: true, select: false }
  });


  //Thread requests
  app.route('/api/threads/:board')
    .get(async (req, res) => {
      const board = req.params.board;
      //collection will be the board
      const Thread = mongoose.model('Thread', ThreadSchema, board);

      //find all documents, but only retrieve the 10 newest ones
      const threadArray = await Thread.find().sort({ bumped_on: "desc" }).limit(10);
      //for each thread in the array...
      for (let thread of threadArray) {
        //...sort replies in array by date and remove all but three (it seems this cannot currently be done via the query)
        thread.replies.sort((a, b) => {
          if (a.created_on > b.created_on) {
            return 1;
          } else {
            return -1;
          }
        });
        thread.replies.splice(3); //...and remove all replies after the third newest one
      }
      res.json(threadArray);
    })

    .post(async (req, res) => {
      const board = req.params.board;
      // Collection will be the board
      const Thread = mongoose.model('Thread', ThreadSchema, board);
      const text = xssFilters.inHTMLData(req.body.text);
      const pass = xssFilters.inHTMLData(req.body.delete_password);
    
      // Create the thread
      const threadCreationDate = new Date();
      const thread = await Thread.create({
        text: text,
        delete_password: pass,
        created_on: threadCreationDate,
        bumped_on: threadCreationDate,
        reported: false, // Set to false by default
        replies: [], // An empty array for replies
      });
    
      res.redirect('back'); // Reload the page
    })

    .delete(async (req, res) => {
      const board = req.params.board;
      //collection will be the board
      const Thread = mongoose.model('Thread', ThreadSchema, board);
      const thread_id = req.body.thread_id;
      const pass = req.body.delete_password;

      let thread = await Thread.findById(thread_id).select('+delete_password');
      if (!thread) {
        res.json({error: "an error has occurred"});
        return;
      }

      if (thread.delete_password == pass) {
        await Thread.findByIdAndDelete(thread_id);
        res.send("success");
        return;
      }
      res.send("incorrect password");
    })

    .put(async (req, res) => {
      const board = req.params.board;
      //collection will be the board
      const Thread = mongoose.model('Thread', ThreadSchema, board);
      const thread_id = req.body.thread_id || req.body.report_id;

      const thread = await Thread.findById(thread_id).select('+reported');
      if (!thread) {
        res.json({error: "an error has occurred"});
        return;
      }
      
      thread.reported = true;
      await thread.save();
      res.send("reported");
    });

  //Reply requests
  app.route('/api/replies/:board')
    .get(async (req, res) => {
      const board = req.params.board;
      //collection will be the board
      const Thread = mongoose.model('Thread', ThreadSchema, board);
      const thread_id = req.query.thread_id;

      const thread = await Thread.findById(thread_id);
      if (!thread) {
        res.json({error: "an error has occurred"});
        return;
      }

      //if thread is found return it
      if (thread) {
        res.json(thread);
        return;
      }
    })

    .post(async (req, res) => {
      const board = req.params.board;
      //collection will be the board
      const Thread = mongoose.model('Thread', ThreadSchema, board);
      const thread_id = xssFilters.inHTMLData(req.body.thread_id);
      const text = xssFilters.inHTMLData(req.body.text);
      const pass = xssFilters.inHTMLData(req.body.delete_password);

      let thread = await Thread.findById(thread_id);
      if (!thread) {
        res.json({error: "an error has occurred"});
        return;
      }

      const replyCreationDate = new Date();
      const newReply = {
        text: text,
        created_on: replyCreationDate,
        delete_password: pass
      };
      thread.replies.push(newReply);
      thread.bumped_on = replyCreationDate; //bump thread
      await thread.save();
      res.redirect('back'); //reload the page
    })

    .delete(async (req, res) => {
      const board = req.params.board;
      //collection will be the board
      const Thread = mongoose.model('Thread', ThreadSchema, board);
      const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;
      const pass = req.body.delete_password;

      let thread = await Thread.findById(thread_id).select('+replies.delete_password');
      if (!thread) {
        res.json({error: "an error has occurred"});
        return;
      }

      //find reply by _id and check password
      const reply = thread.replies.id(reply_id);
      if (!reply) {
        res.json({error: "an error has occurred"});
        return;
      }

      if (reply.delete_password == pass){
        reply.text = "[deleted]"; //delete reply text
        await thread.save();
        res.send("success");
        return;
      }
      res.send("incorrect password");
    })

    .put(async (req, res) => {
      const board = req.params.board;
      //collection will be the board
      const Thread = mongoose.model('Thread', ThreadSchema, board);
      const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;
      
      const thread = await Thread.findById(thread_id).select('+replies.reported');
      if (!thread) {
        res.json({error: "an error has occurred"});
        return;
      }

      //find reply by _id and set reported to true
      const reply = thread.replies.id(reply_id);
      if (!reply) {
        res.json({error: "an error has occurred"});
        return;
      }

      reply.reported = true;
      await thread.save();
      res.send("reported");
    });

};
