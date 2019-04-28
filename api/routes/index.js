const express = require("express");
const router = express.Router();
const randomstring = require("randomstring");
const mongoose = require("mongoose");
const csv = require("csv-parser");
const fs = require("fs");
const math = require("mathjs");

const url =
  "mongodb://markant:emotion2019@ds159025.mlab.com:59025/markantstudy";

mongoose.connect(url);
mongoose.promise = global.Promise;

// const db = mongoose.anchoring;

function zip() {
    let args = [].slice.call(arguments);
    let shortest = args.length===0 ? [] : args.reduce(function(a,b){
        return a.length<b.length ? a : b
    });

    return shortest.map(function(_,i){
        return args.map(function(array){return array[i]})
    });
}

const Schema = mongoose.Schema;

//stance : 1 == for  & 0 == against
// claim : 1== high  & 0 == low
// block: 1== Block & 0 == turn
// sentiment: 1== Hight & 0 == low
const responseSchema = new Schema({
  usertoken: {
    type: String,
    required: true,
    unique: true
  },
  phase: Number,
  stance: { type: Number, required: true },
    sentiment: {type: Number, required:true},
    claim: {type:Number,required:true},
    block: {type:Number,required:true},
  date: {
    type: Date,
    default: Date.now
  },
    permission:{type:String},
    prequestionnaire: Schema.Types.Mixed,
    postquestionnaire: Schema.Types.Mixed,
    prestudy: [Schema.Types.Mixed],
    poststudy: [Schema.Types.Mixed],
    study: [Schema.Types.Mixed],
    decision: [Schema.Types.Mixed],
    responses: { string: Schema.Types.Mixed },
    paid: { type: Boolean, Defult: false }
});

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
// function getGroupString(groupInt) {
//   if (groupInt === 0) {
//     return "control";
//   } else if (groupInt === 1) {
//     return "treatment";
//   }
// }

const allData = JSON.parse(
    fs.readFileSync(`public/data/finalData.json`, "utf8")
);

const Response = mongoose.model("userResponse", responseSchema);

router.get("/api/userinfo", function(req, res) {
  if (req.session.userid) {
    res.json({
      stance: req.session.stance,
        claim: req.session.claim,
        block: req.session.block,
      token: req.session.userid
    });
  } else {
    res.send("please give consent first");
  }
});



router.get("/api/data", function(req, res) {
  let topic = req.session.topic;
  let stance = req.session.stance;
  let claim = req.session.claim;
  let block = req.session.block;
  let sentiment = req.session.sentiment;
  console.log("stance");
  console.log(stance);
  console.log("block");
  console.log(block);
  // let results = JSON.parse(
  //   fs.readFileSync(`public/data/topic${topic}.json`, "utf8")
  // );

    let results = JSON.parse(JSON.stringify(allData[topic]));

    // console.log(results);
    let sortedSentiment =  results["data"].sort(function(a,b){
        return Math.abs(parseFloat(b["sentiment"])) - Math.abs(parseFloat(a["sentiment"]))
    });
    // console.log("SORTED SENTIMENT");
    // console.log(sortedSentiment);
    let claims = sortedSentiment.map(function(d){return +d["claim"]});
    // console.log("CLAIM");
    // console.log(claims);
    let forTexts = sortedSentiment.filter(function(d){return d["stance(-1 or 1)"] === "1"});
    let againstTexts = sortedSentiment.filter(function(d){return d["stance(-1 or 1)"] === "-1"});
    // let claimMedian = math.median(claims);
    // console.log("claim median");
    let quants = math.quantileSeq(claims, [1/3,2/3]);
    // console.log(claimMedian);
    let claimLowQuant = quants[0];
    let claimTopQuant = quants[1];
    console.log(claimLowQuant);
    console.log(claimTopQuant);
    if (stance === 1){

        let highClaimFor = forTexts.filter(function(d){
            return +d["claim"] >= 3
        });
        let lowClaimAgainst = againstTexts.filter(function(d){
            return +d["claim"] < 3
        });

        if (block === 0){
            let zipped = zip(highClaimFor,lowClaimAgainst);
            let weaved = [];
            if (topic % 2===0){
                zipped.forEach(function(l){
                    weaved.push(l[0]);
                    weaved.push(l[1]);
                });
            } else {
                zipped.forEach(function(l){
                    weaved.push(l[1]);
                    weaved.push(l[0]);
                });
            }


            results["data"] = weaved;
            res.status(200).send(results);
        } else if (block === 1){
            let minLength = highClaimFor.length < lowClaimAgainst.length ? highClaimFor : lowClaimAgainst;
            let maxLEngth = highClaimFor.length > lowClaimAgainst.length ? highClaimFor : lowClaimAgainst;
            let weaved = []
            let i,j,temparray,chunk = 10;
            if (topic % 2 ===0){
                for (i=0,j=minLength.length; i<j; i+=chunk) {
                    temparray = highClaimFor.slice(i,i+chunk);
                    weaved = weaved.concat(temparray);
                    temparray = lowClaimAgainst.slice(i,i+chunk);
                    weaved = weaved.concat(temparray);
                }
            } else {
                for (i=0,j=minLength.length; i<j; i+=chunk) {
                    temparray = lowClaimAgainst.slice(i,i+chunk);
                    weaved = weaved.concat(temparray);
                    temparray = highClaimFor.slice(i,i+chunk);
                    weaved = weaved.concat(temparray);

                }
            }

            results["data"] = weaved;
            res.status(200).send(results);
        }
    }
    else if (stance === 0){

        let highClaimAgainst = againstTexts.filter(function(d){
            return +d["claim"] >= 3
        });
        let lowClaimFor = forTexts.filter(function(d){
            return +d["claim"] < 3
        });
        if (block ===0){
            let zipped = zip(lowClaimFor,highClaimAgainst);
            let weaved = [];
            if (topic % 2 === 0){
                zipped.forEach(function(l){
                    weaved.push(l[0]);
                    weaved.push(l[1]);
                });
            } else {
                zipped.forEach(function(l){
                    weaved.push(l[1]);
                    weaved.push(l[0]);
                });
            }
            results["data"] = weaved;
            res.status(200).send(results);
        } else if (block ===1) {
            let minLength = highClaimAgainst.length < lowClaimFor.length ? highClaimAgainst : lowClaimFor;
            let weaved = [];
            let i,j,temparray,chunk = 10;
            if (topic % 2 ===0){
                for (i=0,j=minLength.length; i<j; i+=chunk) {
                    temparray = highClaimAgainst.slice(i,i+chunk);
                    weaved = weaved.concat(temparray);
                    temparray = lowClaimFor.slice(i,i+chunk);
                    weaved = weaved.concat(temparray);

                }
            } else {
                for (i=0,j=minLength.length; i<j; i+=chunk) {
                    temparray = lowClaimFor.slice(i,i+chunk);
                    weaved = weaved.concat(temparray);

                    temparray = highClaimAgainst.slice(i,i+chunk);
                    weaved = weaved.concat(temparray);
                }
            }

            results["data"] = weaved;
            res.status(200).send(results);
        }

    }





});


router.get("/api/consent", function(req, res) {
  // 0 is low 1 is high 2 is control //
  // for order 0 is basic anchoring first, then with map visualization and 1 is map visualization first and then basic anchoring//

  if (!req.session.userid) {
    let token = randomstring.generate(8);
    let stance = getRandomInt(2);
      let claim = getRandomInt(2);
      let block = getRandomInt(2);
      let sentiment = getRandomInt(2);
    // group = 2;
    let phase = 1;
    req.session.topic = 0;
    req.session.userid = token;
    req.session.stance = stance;
    req.session.claim = claim;
    req.session.block = block;
    req.session.sentiment = sentiment;
    req.session.completed = false;
    // console.log(req.session);

    let newResponse = new Response({
      usertoken: token,
      claim: claim,
        stance:stance,
        sentiment:sentiment,
        block: block,
      phase: phase
    });

    newResponse.save(function(err) {
      if (err) console.log(err);
      res.send({ user: token, stance: stance,claim:claim,block:block, sentiment: sentiment, phase: phase });
    });
  } else {
    res.send("consent already given");
  }
});

router.post("/api/prestudy", function(req, res) {
  let token = req.session.userid;
  let data = req.body;
  let topic = req.session.topic;
  // console.log(data);
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
  // console.log(data);

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

router.post("/api/poststudy", function(req, res) {
    let token = req.session.userid;
    let data = req.body;
    let topic = req.session.topic;
    // console.log(data);
    data["topic"] = topic;
    Response.findOneAndUpdate(
        { usertoken: token },
        {
            $push: { poststudy: data }
        },
        function(err, doc) {
            if (err) {
                // console.log(err);
                return res.send(500, { error: err });
            }
            return res.send(200, `succesfully saved pre study for topic ${topic}`);
        }
    );
});

router.post("/api/decision", function(req, res) {
  let token = req.session.userid;
  let data = req.body;
  // console.log(data);
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
  // console.log(data);
  Response.findOneAndUpdate(
    { usertoken: token, questionnaire: { $exists: false } },
    {
      prequestionnaire: data
    },
    function(err, doc) {
      if (err) return res.send(500, { error: err });
      // console.log("yeaah");
      return res.send("successfully saved!");
    }
  );
});

router.post("/api/post", function(req, res) {
    let token = req.session.userid;
    let data = req.body;
    // console.log(data);
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

router.post("/api/permission",function(req,res){
    let token = req.session.userid;
    let data = req.body;
    console.log(data);
    Response.findOneAndUpdate(
        { usertoken: token },
        data,
        function(err, doc) {
            if (err) return res.send(500, { error: err });
            console.log("yeaah");
            return res.send("successfully saved!");
        }
    );
})

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
  if (!req.session.completed){
      res.render("preforms.html");
  }

});

router.get("/postforms", function(req, res) {
  res.render("postforms.html");
});

router.get("/study", function(req, res) {
  if(!req.session.completed)
  {
      res.render("study.html");
  } else {
      res.render("debrief.html");
  }

});

router.get("/poststudy",function(req,res){
    if(!req.session.completed)
    {
  res.render("poststudy.html")}
    else {
        res.render("debrief.html");
    }
});

router.get("/prestudy", function(req, res) {
    if(!req.session.completed)
    {
  res.render("prestudy.html");}else {
        res.render("debrief.html");
    }
});

router.get("/decide", function(req, res) {
    if(!req.session.completed)
    {
  res.render("decide.html");}else {
        res.render("debrief.html");
    }
});


router.get("/next", function(req, res) {
  req.session.topic += 1;
  if (req.session.topic > 3) {
    req.session.completed = true;
    res.redirect("/postforms");
  } else {
    res.redirect("/prestudy");
  }
});

router.get("/debrief", function(req, res) {
  res.render("debrief.html");
});
module.exports = router;

