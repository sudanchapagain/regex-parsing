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
    return inputLine
      .split("")
      .some((char) => isDigitCharacter(char.charCodeAt(0)));
  } else if (pattern === "\\w") {
    return inputLine
      .split("")
      .some((char) => isWordCharacter(char.charCodeAt(0)));
  } else if (pattern.startsWith("[^") && pattern.endsWith("]")) {
    const excludedChars = new Set(pattern.slice(2, -1));
    return inputLine.split("").every((char) => !excludedChars.has(char));
  } else if (pattern.startsWith("[") && pattern.endsWith("]")) {
    const includedChars = new Set(pattern.slice(1, -1));
    return inputLine.split("").some((char) => includedChars.has(char));
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
    } else if (pattern[i] === "+") {
      const prevChar = compare.pop();
      compare.push(prevChar + "+");
    } else {
      compare.push(pattern[i]);
    }
  }

  let compareIndex = 0;
  for (let i = 0; i < inputLine.length; i++) {
    if (compareIndex >= compare.length) break;

    const currentCompare = compare[compareIndex];
    const char = inputLine[i];

    if (currentCompare.endsWith("+")) {
      const basePattern = currentCompare.slice(0, -1);

      if (matchesPattern(char, basePattern)) {
        compareIndex++;
        while (matchesPattern(inputLine[i + 1], basePattern)) {
          i++;
        }
      } else {
        return false;
      }
    } else if (matchesPattern(char, currentCompare)) {
      compareIndex++;
    } else {
      compareIndex = 0;
    }
  }

  return compareIndex === compare.length;
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
