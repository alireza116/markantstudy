const express = require("express");
const router = express.Router();
const randomstring = require("randomstring");
const mongoose = require("mongoose");
const csv = require("csv-parser");
const fs = require("fs");

const url =
  "mongodb://markant:emotion2019@ds159025.mlab.com:59025/markantstudy";

mongoose.connect(url);
mongoose.promise = global.Promise;

// const db = mongoose.anchoring;

const Schema = mongoose.Schema;

const responseSchema = new Schema({
  usertoken: {
    type: String,
    required: true,
    unique: true
  },
  phase: Number,
  group: { type: String, required: true },
  date: {
    type: Date,
    default: Date.now
  },
    prequestionnaire: Schema.Types.Mixed,
    postquestionnaire: Schema.Types.Mixed,
  prestudy: [Schema.Types.Mixed],
  study: [Schema.Types.Mixed],
  decision: [Schema.Types.Mixed],
  responses: { string: Schema.Types.Mixed },
  paid: { type: Boolean, Defult: false }
});

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
function getGroupString(groupInt) {
  if (groupInt === 0) {
    return "control";
  } else if (groupInt === 1) {
    return "treatment";
  }
}

const Response = mongoose.model("userResponse", responseSchema);

router.get("/api/userinfo", function(req, res) {
  if (req.session.userid) {
    res.json({
      group: req.session.group,
      token: req.session.userid
    });
  } else {
    res.send("please give consent first");
  }
});

router.get("/api/data", function(req, res) {
  let topic = req.session.topic;
  let respons = {};
  let results = JSON.parse(
    fs.readFileSync(`public/data/topic${topic}.json`, "utf8")
  );
  res.send(200, results);
});

router.get("/api/consent", function(req, res) {
  // 0 is low 1 is high 2 is control //
  // for order 0 is basic anchoring first, then with map visualization and 1 is map visualization first and then basic anchoring//

  if (!req.session.userid) {
    let token = randomstring.generate(8);
    let group = getGroupString(getRandomInt(2));
    // group = 2;
    let phase = 1;
    req.session.topic = 1;
    req.session.userid = token;
    req.session.group = group;
    req.session.completed = false;
    console.log(req.session);

    let newResponse = new Response({
      usertoken: token,
      group: group,
      phase: phase
    });

    newResponse.save(function(err) {
      if (err) console.log(err);
      res.send({ user: token, group: group, phase: phase });
    });
  } else {
    res.send("consent already given");
  }
});

router.post("/api/prestudy", function(req, res) {
  let token = req.session.userid;
  let data = req.body;
  let topic = req.session.topic;
  console.log(data);
  data["topic"] = topic;
  Response.findOneAndUpdate(
    { usertoken: token },
    {
      $push: { prestudy: data }
    },
    function(err, doc) {
      if (err) {
        console.log(err);
        return res.send(500, { error: err });
      }
      return res.send(200, `succesfully saved pre study for topic ${topic}`);
    }
  );
});

router.post("/api/study", function(req, res) {
  let token = req.session.userid;
  let data = req.body;
  console.log(data);

  let topic = req.session.topic;

  data["topic"] = topic;
  Response.findOneAndUpdate(
    { usertoken: token },
    {
      $push: { study: data }
    },
    function(err, doc) {
      if (err) {
        return res.send(500, { error: err });
      }
      return res.send(200, `successfully saved study for topic ${topic}`);
    }
  );
});

router.post("/api/decision", function(req, res) {
  let token = req.session.userid;
  let data = req.body;
  console.log(data);
  let topic = req.session.topic;
  data["topic"] = topic;
  Response.findOneAndUpdate(
    { usertoken: token },
    {
      $push: { decision: data }
    },
    function(err, doc) {
      if (err) {
        return res.send(500, { error: err });
      }
      return res.send(200, `successfully saved decision for topic ${topic}`);
    }
  );
});

router.post("/api/pre", function(req, res) {
  let token = req.session.userid;
  let data = req.body;
  console.log(data);
  Response.findOneAndUpdate(
    { usertoken: token, questionnaire: { $exists: false } },
    {
      prequestionnaire: data
    },
    function(err, doc) {
      if (err) return res.send(500, { error: err });
      console.log("yeaah");
      return res.send("successfully saved!");
    }
  );
});

router.post("/api/post", function(req, res) {
    let token = req.session.userid;
    let data = req.body;
    console.log(data);
    Response.findOneAndUpdate(
        { usertoken: token, questionnaire: { $exists: false } },
        {
            postquestionnaire: data
        },
        function(err, doc) {
            if (err) return res.send(500, { error: err });
            console.log("yeaah");
            return res.send("successfully saved!");
        }
    );
});

router.get("/", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("consent.html");
  }
});

router.get("/consent", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("consent.html");
  }
});

router.get("/instructions", function(req, res) {
  if (req.session.completed) {
    res.render("debrief.html");
  } else {
    res.render("instructions.html");
  }
});

router.get("/preforms", function(req, res) {
  res.render("preforms.html");
});

router.get("/postforms", function(req, res) {
  res.render("postforms.html");
});

router.get("/study", function(req, res) {
  res.render("study.html");
});

router.get("/prestudy", function(req, res) {
  res.render("prestudy.html");
});

router.get("/decide", function(req, res) {
  res.render("decide.html");
});

router.get("/next", function(req, res) {
  req.session.topic += 1;
  if (req.session.topic > 2) {
    res.redirect("/postforms");
  } else {
    res.redirect("/prestudy");
  }
});

router.get("/debrief", function(req, res) {
  res.render("debrief.html");
});
module.exports = router;
