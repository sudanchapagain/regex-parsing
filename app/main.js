function matchPattern(inputLine, pattern) {
  if (pattern.length === 1) {
    return inputLine.includes(pattern);
  } else {
    throw new Error(`Unhandled pattern ${pattern}`);
  }
}

function checkDigit() {
  const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  for (let char of digits) {
    if (digits.includes(char)) {
      return true;
    }
  }
  return false;
}

function main() {
  const pattern = process.argv[3];
  const inputLine = require("fs").readFileSync(0, "utf-8").trim();

  if (process.argv[2] !== "-E") {
    console.log("Expected first argument to be '-E'");
    process.exit(1);
  }

  if (process.argv[4] === "\\d") {
    if (checkDigit()) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  if (matchPattern(inputLine, pattern)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
