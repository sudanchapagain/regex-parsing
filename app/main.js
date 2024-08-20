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
  } else if (pattern.endsWith("$")) {
    return matchComplexPattern(inputLine, pattern.slice(0, -1), false, true);
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

function matchComplexPattern(
  inputLine,
  pattern,
  matchFromStart = false,
  matchToEnd = false
) {
  if (matchFromStart) {
    if (inputLine.length < pattern.length) return false;
    for (let i = 0; i < pattern.length; i++) {
      if (!matchesPattern(inputLine[i], pattern[i])) {
        return false;
      }
    }
    return true;
  }

  if (matchToEnd) {
    if (inputLine.length < pattern.length) return false;
    let inputStart = inputLine.length - pattern.length;
    for (let i = 0; i < pattern.length; i++) {
      if (!matchesPattern(inputLine[inputStart + i], pattern[i])) {
        return false;
      }
    }
    return true;
  }

  return matchAnywhereInLine(inputLine, pattern);
}

function matchesPattern(char, patternChar) {
  if (patternChar === "\\d") {
    return isDigitCharacter(char.charCodeAt(0));
  }
  if (patternChar === "\\w") {
    return isWordCharacter(char.charCodeAt(0));
  }
  return char === patternChar;
}

function matchAnywhereInLine(inputLine, pattern) {
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

    if (matchesPattern(inputLine[i], compare[compareCount])) {
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
