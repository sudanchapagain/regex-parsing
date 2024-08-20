function matchPattern(inputLine, pattern) {
  const inputLength = inputLine.length;
  const patternLength = pattern.length;

  let i = 0;
  let j = 0;

  while (i < inputLength && j < patternLength) {
    if (pattern[j] === "\\") {
      j++; // character after '\'

      if (pattern[j] === "d") {
        // if pattern is d then check input is a digit
        if (inputLine[i] >= "0" && inputLine[i] <= "9") {
          i++;
          j++;
        } else {
          return false;
        }
      } else if (pattern[j] === "w") {
        // if pattern is w then check input is a A-Z, a-z, 0-9 or _
        if (
          (inputLine[i] >= "a" && inputLine[i] <= "z") ||
          (inputLine[i] >= "A" && inputLine[i] <= "Z") ||
          (inputLine[i] >= "0" && inputLine[i] <= "9") ||
          inputLine[i] === "_"
        ) {
          i++;
          j++;
        } else {
          return false;
        }
      } else {
        throw new Error(`Unhandled escape sequence: \\${pattern[j]}`);
      }
    } else if (pattern[j] === "[") {
      let negate = false;
      j++; // after [
      if (pattern[j] === "^") {
        negate = true;
        j++; // after ^
      }

      const charGroup = [];
      while (pattern[j] !== "]") {
        if (j >= patternLength) {
          throw new Error(`Unmatched [ in pattern: ${pattern}`);
        }
        charGroup.push(pattern[j]);
        j++;
      }
      j++; // after ]

      if (negate) {
        if (!charGroup.includes(inputLine[i])) {
          i++;
        } else {
          return false;
        }
      } else {
        if (charGroup.includes(inputLine[i])) {
          i++;
        } else {
          return false;
        }
      }
    } else {
      if (inputLine[i] === pattern[j]) {
        i++;
        j++;
      } else {
        return false;
      }
    }
  }

  return j === patternLength;
}

function main() {
  try {
    const pattern = process.argv[3];
    const inputLine = require("fs").readFileSync(0, "utf-8").trim();

    if (matchPattern(inputLine, pattern)) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
