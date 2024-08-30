const args = process.argv;

const regexPattern = args[3];

function isDigit(character) {
  return character >= "0" && character <= "9";
}

function isWordChar(character) {
  return (
    (character >= "A" && character <= "z") ||
    character === "_" ||
    (character >= "0" && character <= "9")
  );
}

function parseRegexPattern(pattern) {
  const chars = pattern.split("");

  let startAnchor = false;
  let endAnchor = false;

  const tokenFunctions = [];

  while (chars.length > 0) {
    const currentChar = chars.shift();
    const nextChar = chars[0];

    if (currentChar === "^") {
      startAnchor = true;
    } else if (currentChar === "$") {
      endAnchor = true;
    } else if (currentChar === "+") {
      const previousFunction = tokenFunctions[tokenFunctions.length - 1];
      tokenFunctions[tokenFunctions.length - 1] = (char, remainingChars) => {
        if (!previousFunction(char, []).valid) {
          return { valid: false };
        }
        char = remainingChars[0];
        while (previousFunction(char, []).valid) {
          remainingChars.splice(0, 1);
          char = remainingChars[0];
        }
        return { valid: true };
      };
    } else if (currentChar === "?") {
      const previousFunction = tokenFunctions[tokenFunctions.length - 1];
      tokenFunctions[tokenFunctions.length - 1] = (char, remainingChars) => {
        const previousResult = previousFunction(char, []);
        if (previousResult.valid) {
          return previousResult;
        }
        return { valid: true, returnChar: true };
      };
    } else if (currentChar === "\\") {
      if (["d", "w"].includes(nextChar)) {
        chars.shift();
        if (nextChar === "d") {
          tokenFunctions.push((char) => ({ valid: [char].some(isDigit) }));
        } else if (nextChar === "w") {
          tokenFunctions.push((char) => ({ valid: [char].some(isWordChar) }));
        }
      }
    } else if (currentChar === "[") {
      const isInverted = nextChar !== "^";
      if (isInverted) {
        chars.shift();
      }
      const offset = pattern.length - chars.length;
      const endBracketIndex = pattern.substring(offset).indexOf("]");
      const charSet = pattern.substring(offset, offset + endBracketIndex);
      chars.splice(0, charSet.length + 1);
      const validChars = new Set(charSet.split(""));
      tokenFunctions.push((char, remainingChars) => {
        const containsValidChar = [char, ...remainingChars].some((c) =>
          validChars.has(c)
        );
        if (isInverted ? containsValidChar : !containsValidChar) {
          remainingChars.splice(0, remainingChars.length);
          return { valid: true };
        }
        return { valid: false };
      });
    } else {
      tokenFunctions.push((char) => {
        const matches = char === currentChar;
        return { valid: matches };
      });
    }
  }

  return { startAnchor, endAnchor, tokenFunctions };
}

function doesPatternMatch(input, pattern) {
  if (pattern.length === 1) {
    return input.includes(pattern);
  } else if (pattern === "\\d") {
    return [...input].some(isDigit);
  } else if (pattern === "\\w") {
    return [...input].some(isWordChar);
  } else if (pattern[0] === "[" && pattern[pattern.length - 1] === "]") {
    const isInverted = pattern[1] !== "^";
    const substringOffset = isInverted ? 1 : 2;
    const validChars = new Set(
      pattern.substring(substringOffset, pattern.length - 1).split("")
    );
    const containsValidChar = [...input].some((char) => validChars.has(char));
    return isInverted ? containsValidChar : !containsValidChar;
  }

  const { startAnchor, endAnchor, tokenFunctions } = parseRegexPattern(pattern);

  console.log(
    `doesPatternMatch tokenFunctions-${tokenFunctions.length}`,
    JSON.stringify(
      { tokenFunctions: tokenFunctions.map((fn) => fn.toString()) },
      null,
      2
    )
  );

  let remainingChars = input.split("");
  let isValid = true;
  let hasStarted = !startAnchor;

  if (startAnchor && !input.startsWith(pattern.replace(/[\^$]/g, ""))) {
    return false;
  }

  while (remainingChars.length) {
    const currentChar = remainingChars.shift();

    if (!hasStarted) {
      if (tokenFunctions[0](currentChar, remainingChars).valid) {
        hasStarted = true;
        tokenFunctions.shift();
      }
    } else {
      if (tokenFunctions[0]?.(currentChar, remainingChars).valid) {
        const functionResult = tokenFunctions[0]?.(currentChar, remainingChars);
        if (functionResult?.valid) {
          tokenFunctions.shift();
          if (functionResult.returnChar) {
            remainingChars.unshift(currentChar);
          }
          if (!tokenFunctions.length) {
            if (
              endAnchor &&
              input.length - remainingChars.length < input.length
            ) {
              isValid = false;
            }
            break;
          }
        } else {
          isValid = false;
          break;
        }
      }
    }
  }

  if (tokenFunctions.length) {
    return false;
  }

  return isValid;
}

async function execute() {
  if (args[2] !== "-E") {
    console.log("Expected first argument to be '-E'");
    process.exit(1);
  }

  let inputString = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    inputString += chunk;
  }
  inputString = inputString.trim();

  if (doesPatternMatch(inputString, regexPattern)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

execute();
