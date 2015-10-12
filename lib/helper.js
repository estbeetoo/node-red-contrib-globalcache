/**
 * Created by Y on 11.10.2015.
 */
function CCFValid_(strInput){
    //check for valid ccf format
    if (typeof (strInput) !== "string")
        return false;

    var iLength = strInput.length;
    if (iLength < 29 || iLength > 1299)
        return false;

    for (var i = 0; i < iLength; i++){
        if (!((strInput[i] >= '0' && strInput[i] <= '9') ||
            (strInput[i] >= 'a' && strInput[i] <= 'f') ||
            (strInput[i] >= 'A' && strInput[i] <= 'F') ||
            strInput[i] == ' '))
            return false;
    }

    return true;
}

function CCFtoGC(strInput, cmdName, modAdr, connAdr, repeatCount){
    if (!CCFValid_(strInput))
        throw "Error: Please enter a valid hex code sequence.";

    var modAdress = modAdr || "[mod-adr]";
    var conAdress = connAdr || "[conn-adr]";
    var repeat = repeatCount || "[repeatcount]";
    var cmd = cmdName || "sendir";

    var strArray = strInput.split(' ', 1024);
    var iNumElements = strArray.length;

    var iFreqVal = parseInt(strArray[1], 16);
    var iFreq = Math.floor((((41450 / iFreqVal) + 5) / 10) * 1000);
    //var iFreq = Math.floor(1000000 / (iFreqVal * 0.241246));

    var iOnceSequenceLength = parseInt(strArray[2], 16); //No of pulses that is sent once when button is pressed
    var iRepeatableSequenceLength = parseInt(strArray[3], 16); //No of pulses that are repeatable while button pressed
    if ((iNumElements - 4) != 2*(iOnceSequenceLength + iRepeatableSequenceLength))
        throw "Error: Please enter a valid hex code sequence.";

    var iSeq = 1;
    var finalString = cmd + "," + modAdress + ":" + conAdress + "," + iSeq.toString() + "," + iFreq.toString() + "," + repeat + ",1";

    var iVal = 0;
    for (var i = 4; i < iNumElements; i++){
        iVal = parseInt(strArray[i], 16);
        finalString = finalString + "," + iVal.toString();
    }

    return finalString;
}

function CCFtoRAW(strInput){
    if (!CCFValid_(strInput))
        throw "Error: Please enter a valid hex code sequence.";

    var strArray = strInput.split(' ', 1024);
    var iNumElements = strArray.length;

    var iFreqVal = parseInt(strArray[1], 16);
    var iFreq = Math.floor(1000000 / (iFreqVal * 0.241246));

    var iOnceSequenceLength = parseInt(strArray[2], 16); //No of pulses that is sent once when button is pressed
    var iRepeatableSequenceLength = parseInt(strArray[3], 16); //No of pulses that are repeatable while button pressed

    var dPulseWidths = [];

    for (var i = 4; i < iNumElements; i++){
        dPulseWidths.push(Math.floor(1000000 * parseInt(strArray[i], 16) / iFreq));
    }

    if (dPulseWidths.length != 2*(iOnceSequenceLength + iRepeatableSequenceLength))
        throw "Error: Please enter a valid hex code sequence.";

    return dPulseWidths.join(" ");
}

function toX04_(num){
    var hexVal = "0000";
    var hexStr = num.toString(16);
    var hexStrLen = hexStr.length;
    if (hexStrLen >= 4)
        return hexStr;

    var hexArr = hexVal.split("");
    hexArr.splice((4 - hexStrLen), hexStrLen);
    hexVal = hexArr.join("");
    hexVal = hexVal + hexStr;
    return hexVal;

}

function GCtoCCF(strInput){
    var strArray = [];
    var delimiter = ',';
    var finalString = "0000 ";
    var iFreqNum = 0;
    var iFreq = 0;
    var iPairData = 0;
    var tmpString = "";

    var iTransCount = 0;
    var strTransCount = "";
    var strRepeatCount = "0000";

    if (strInput.length = 0)
        throw "Error: Please enter a valid sendir command.";

    strArray = strInput.split(delimiter, 1024);

    if (strArray.length < 6)
        throw "Error: Please enter a valid sendir command.";

    if (strArray[3] == "")
        throw "Error: Error parsing data. Please try again.";

    iFreqNum = parseInt(strArray[3]);
    if (iFreqNum == 0)
        throw "Error: Error parsing data. Please try again.";

    iFreq = Math.floor(41450 / (iFreqNum / 100));

    tmpString = toX04_(iFreq);
    iTransCount = (strArray.length - 6) / 2;

    strTransCount = toX04_(iTransCount);

    finalString = finalString + tmpString + " " + strRepeatCount + " " + strTransCount;

    for (var i = 6; i < strArray.length; i++){
        if (strArray[i] == "")
            throw "Error: Error parsing data. Please try again.";
        iPairData = parseInt(strArray[i]);
        tmpString = toX04_(iPairData);
        finalString = finalString + " " + tmpString;
    }

    return finalString;
}

module.exports = {
    CCFtoGC: CCFtoGC,
    GCtoCCF: GCtoCCF,
    CCFtoRAW: CCFtoRAW
}