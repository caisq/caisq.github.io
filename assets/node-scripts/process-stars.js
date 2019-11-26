var StarAuxData = require("./star-aux-data.js");

var CsvParser = require("csv-parse");
var fs = require("fs");

var htmlFileName = "../../stars.html";
var dataFileName = "../data/hygdata_v3.csv";

var tagBegin = "/* DO NOT EDIT: Auto-filled */";
var tagEnd = "/* ~DO NOT EDIT: Auto-filled */";

var starIDs = [];
var starNames = [];
var starCons = [];
var starOrds = [];
var starIDRegexes = [];
var starInfo = [];

/* Read the HTML file and get the star names */
var htmlTxt = fs.readFileSync(htmlFileName, 'utf8');
var matches = htmlTxt.match(/area id=\"[a-zA-Z0-9_]*\"/g);

for (var i = 0; i < matches.length; ++i) {
    var starID = matches[i].replace("area id=\"", "");
    starID = starID.replace("\"", "");
    starIDs.push(starID);

    var starCon = starID.split("_")[0];
    var starOrd = starID.split("_")[1];
    starCon = starCon.toUpperCase().substring(0, 1) + starCon.substring(1, starCon.length);
    starOrd = starOrd.toUpperCase().substring(0, 1) + starOrd.substring(1, starOrd.length);

    var starName = starOrd + " " + starCon;
    starNames.push(starName);

    if (starCon.length > 3) {
        starCon = starCon.substring(0, 3);
    }

    if (starOrd.length > 3 && starOrd[0] !== "V") {
        starOrd = starOrd.substring(0, 3);
    }

    var starIDRegex = new RegExp(".*" + starOrd + ".*" + starCon);
    starIDRegexes.push(starIDRegex);
    starCons.push(starCon);
    starOrds.push(starOrd);

    starInfo.push({});

    console.log("starID = " + starID + "; starName = " + starName + "; starIDRegex = " + starIDRegex);

}

/* Locate the insertion point */
var idxTagBegin = htmlTxt.indexOf(tagBegin);
if (idxTagBegin === -1) {
    throw new Error("Cannot find begin tag");
}
console.log(idxTagBegin);

var idxTagEnd = htmlTxt.indexOf(tagEnd);
if (idxTagEnd === -1) {
    throw new Error("Cannot find end tag");
}
console.log(idxTagEnd);


/* Read star data from the data base and find any matches */
console.log("");
console.log("Looking up stars in data base");
console.log("");

var csvParser = CsvParser();

var csvTxt = fs.readFileSync(dataFileName);

var bfCol = NaN;     // Column: name, such as "50Alp Cyg"
var conCol = NaN;    // Column: constellation, such as "Cyg"
var magCol = NaN;    // Column: apparent magnitude
var properCol = NaN; // Column: proper name (e.g., Deneb)
var distCol = NaN;   // Column: distance (ly)
var varCol = NaN;

// Use the writable stream API
csvParser.on("readable", function() {
    while (record = csvParser.read()) {
        if (isNaN(bfCol)) { // Header column
            bfCol = record.indexOf("bf");
            conCol = record.indexOf("con");
            magCol = record.indexOf("mag");
            properCol = record.indexOf("proper");
            distCol = record.indexOf("dist");
            varCol = record.indexOf("var");

            console.log("bfCol = ", bfCol);
            console.log("conCol = ", conCol);
            console.log("varCol = ", varCol);

        } else {
            var bf = record[bfCol];
            var con = record[conCol];
            var varName = record[varCol];

            var idxMatch = NaN;
            for (var j = 0; j < starIDRegexes.length; ++j) {
                if (bf.match(starIDRegexes[j]) !== null) {
                    idxMatch = j;
                    console.log(bf);
                    break;
                }

                // Match by var name
                if (varName === "V1584") {
                    console.log("=====");
                    console.log(starOrds[j]);
                    console.log(starCons[j]);
                }
                if (con === starCons[j] && varName === starOrds[j]) {

                    idxMatch = j;
                    console.log(varName);
                    break;
                }
            }

            if (isNaN(idxMatch)) {
                continue;
            }

            var tStarID = starIDs[idxMatch];

            var lightyearsInParsec = 3.26156;
            var info = {
                StarName       : starNames[j],
                ApparentMag    : record[magCol],
                Dist           : record[distCol] * lightyearsInParsec,
                NameChinese    : StarAuxData[tStarID].NameChinese,
                WikipediaLink  : StarAuxData[tStarID].WikipediaLink
            };

            if (record[properCol].length > 0) {
                info.StarName = info.StarName + " (" + record[properCol] + ")";
            }

            starInfo[idxMatch] = info;

            console.log("Row matches star: \"" + starIDs[idxMatch] + "\", info =", info);
        }

    }
});

// Catch any error
csvParser.on('error', function(err){
    console.log(err.message);
});

//
csvParser.on('finish', function(){
    console.log("finish!");
});

csvParser.write(csvTxt);

var starData = {};

for (var i = 0; i < starIDs.length; ++i) {
    starData[starIDs[i]] = starInfo[i];
}

var starDataStr = JSON.stringify(starData, null, "    ");

var htmlTxtFilled = htmlTxt.substring(0, idxTagBegin + tagBegin.length) + "\n" +
                    "var starData = " + starDataStr + ";\n" +
                    htmlTxt.substring(idxTagEnd, htmlTxt.length) + "\n";

fs.writeFileSync(htmlFileName, htmlTxtFilled, "utf8");