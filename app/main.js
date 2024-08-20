const fs = require("fs");
const args = process.argv;

const pattern = args[3];
const inputLine = fs.readFileSync(0, "utf-8").trim();

function isWordCharacter(ascii) {
  return (
    (ascii >= 48 && ascii <= 57) || // 0-9
    (ascii >= 65 && ascii <= 90) || // A-Z
    (ascii >= 97 && ascii <= 122) || // a-z
    ascii === 95 // _
  );
}

function isDigitCharacter(ascii) {
  return ascii >= 48 && ascii <= 57; // 0-9
}

function matchPattern(inputLine, pattern) {
  if (pattern.startsWith("^")) {
    return matchComplexPattern(inputLine, pattern.slice(1), true);
  }

  if (pattern === "\\d") {
    for (let i = 0; i < inputLine.length; i++) {
      if (isDigitCharacter(inputLine.charCodeAt(i))) {
        return true;
      }
    }
    return false;
  } else if (pattern === "\\w") {
    for (let i = 0; i < inputLine.length; i++) {
      if (isWordCharacter(inputLine.charCodeAt(i))) {
        return true;
      }
    }
    return false;
  } else if (pattern.startsWith("[^") && pattern.endsWith("]")) {
    const excludedChars = new Set(pattern.slice(2, -1));
    for (let i = 0; i < inputLine.length; i++) {
      if (!excludedChars.has(inputLine[i])) {
        return true;
      }
    }
    return false;
  } else if (pattern.startsWith("[") && pattern.endsWith("]")) {
    const includedChars = new Set(pattern.slice(1, -1));
    for (let i = 0; i < inputLine.length; i++) {
      if (includedChars.has(inputLine[i])) {
        return true;
      }
    }
    return false;
  } else if (pattern.length === 1) {
    return inputLine.includes(pattern);
  } else {
    return matchComplexPattern(inputLine, pattern);
  }
}

function matchComplexPattern(inputLine, pattern, matchFromStart = false) {
  if (matchFromStart && pattern.length > 0) {
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "\\") {
        if (
          pattern[i + 1] === "d" &&
          isDigitCharacter(inputLine.charCodeAt(i))
        ) {
          i++;
        } else if (
          pattern[i + 1] === "w" &&
          isWordCharacter(inputLine.charCodeAt(i))
        ) {
          i++;
        } else {
          return false;
        }
      } else if (inputLine[i] !== pattern[i]) {
        return false;
      }
    }
    return true;
  }

  let compare = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "\\") {
      if (pattern[i + 1] === "d") {
        compare.push("\\d");
      } else if (pattern[i + 1] === "w") {
        compare.push("\\w");
      }
      i++;
    } else {
      compare.push(pattern[i]);
    }
  }

  let compareCount = 0;
  for (let i = 0; i < inputLine.length; i++) {
    if (compareCount === compare.length) break;

    const charAscii = inputLine.charCodeAt(i);
    const currentCompare = compare[compareCount];

    if (currentCompare === "\\w") {
      if (isWordCharacter(charAscii)) {
        compareCount++;
      } else {
        compareCount = 0;
      }
    } else if (currentCompare === "\\d") {
      if (isDigitCharacter(charAscii)) {
        compareCount++;
      } else {
        compareCount = 0;
      }
    } else if (inputLine[i] === currentCompare) {
      compareCount++;
    } else {
      compareCount = 0;
    }
  }

  return compareCount === compare.length;
}

function main() {
  if (args[2] !== "-E") {
    console.error("Expected first argument to be '-E'");
    process.exit(1);
  }

  if (matchPattern(inputLine, pattern)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
