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
  const characters = pattern.split("");
  let hasStartAnchor = false;
  let hasEndAnchor = false;
  const tokenParsers = [];

  while (characters.length > 0) {
    const currentCharacter = characters.shift();
    const nextCharacter = characters[0];

    if (currentCharacter === "^") {
      hasStartAnchor = true;
    } else if (currentCharacter === "$") {
      hasEndAnchor = true;
    } else if (currentCharacter === "+") {
      const previousParser = tokenParsers[tokenParsers.length - 1];
      tokenParsers[tokenParsers.length - 1] = (char, remainingChars) => {
        if (!previousParser(char, []).valid) {
          return { valid: false };
        }
        char = remainingChars[0];
        while (previousParser(char, []).valid) {
          remainingChars.splice(0, 1);
          char = remainingChars[0];
        }
        return { valid: true };
      };
    } else if (currentCharacter === "?") {
      const previousParser = tokenParsers[tokenParsers.length - 1];
      tokenParsers[tokenParsers.length - 1] = (char, remainingChars) => {
        const previousResult = previousParser(char, []);
        if (previousResult.valid) {
          return previousResult;
        }
        return { valid: true, returnChar: true };
      };
    } else if (currentCharacter === ".") {
      tokenParsers.push((char, remainingChars) => {
        return { valid: true };
      });
    } else if (currentCharacter === "\\") {
      if (["d", "w"].includes(nextCharacter)) {
        characters.shift();
        if (nextCharacter === "d") {
          tokenParsers.push((char, remainingChars) => ({
            valid: [char].some(isDigit),
          }));
        } else if (nextCharacter === "w") {
          tokenParsers.push((char, remainingChars) => ({
            valid: [char].some(isWordChar),
          }));
        }
      }
    } else if (currentCharacter === "[") {
      const isInverted = nextCharacter !== "^";
      if (!isInverted) {
        characters.shift();
      }
      const offset = pattern.length - characters.length;
      const closingBracketIndex = pattern.substring(offset).indexOf("]");
      if (closingBracketIndex === -1) {
        console.log("Invalid pattern, missing ']'");
        process.exit(2);
        return;
      }
      const characterSet = pattern.substring(
        offset,
        offset + closingBracketIndex
      );
      characters.splice(0, characterSet.length + 1);
      const validCharacters = new Set(characterSet.split(""));
      tokenParsers.push((char, remainingChars) => {
        const containsValidCharacter = [char, ...remainingChars].some((c) =>
          validCharacters.has(c)
        );
        if (isInverted ? containsValidCharacter : !containsValidCharacter) {
          remainingChars.splice(0, remainingChars.length);
          return { valid: true };
        }
        return { valid: false };
      });
    } else if (currentCharacter === "(") {
      const offset = pattern.length - characters.length;
      const closingParenthesisIndex = pattern.substring(offset).indexOf(")");
      if (closingParenthesisIndex === -1) {
        console.log("Invalid pattern, missing ')'");
        process.exit(2);
        return;
      }
      const groupPattern = pattern.substring(
        offset,
        offset + closingParenthesisIndex
      );
      characters.splice(0, groupPattern.length + 1);
      if (groupPattern.includes("|")) {
        const alternatives = groupPattern.split("|");
        tokenParsers.push((char, remainingChars) => {
          const inputString = [char, ...remainingChars].join("");
          const matchingAlternative = alternatives.find((alt) =>
            inputString.startsWith(alt)
          );
          if (matchingAlternative) {
            remainingChars.splice(0, matchingAlternative.length - 1);
            return { valid: true };
          }
          return { valid: false };
        });
      } else {
        console.log("Unsupported pattern");
        process.exit(2);
        return;
      }
    } else {
      tokenParsers.push(([char, remainingChars]) => {
        const isValid = char === currentCharacter;
        return { valid: isValid };
      });
    }
  }

  return { hasStartAnchor, hasEndAnchor, tokenParsers };
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
    const validCharacters = new Set(
      pattern.substring(substringOffset, pattern.length - 1).split("")
    );
    const containsValidCharacter = [...input].some((char) =>
      validCharacters.has(char)
    );
    return isInverted ? containsValidCharacter : !containsValidCharacter;
  }

  const { hasStartAnchor, hasEndAnchor, tokenParsers } =
    parseRegexPattern(pattern);

  let remainingChars = input.split("");
  let isValid = hasStartAnchor;
  let hasStarted = hasStartAnchor;

  while (remainingChars.length) {
    const currentCharacter = remainingChars.shift();
    if (!hasStarted) {
      if (tokenParsers[0](currentCharacter, remainingChars).valid) {
        hasStarted = true;
        isValid = true;
        tokenParsers.shift();
      }
    } else {
      const parseResult = tokenParsers[0]?.(currentCharacter, remainingChars);
      if (parseResult?.valid) {
        tokenParsers.shift();
        if (parseResult.returnChar) {
          remainingChars.unshift(currentCharacter);
        }
        if (!tokenParsers.length) {
          if (
            hasEndAnchor &&
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

  if (tokenParsers.length) {
    return false;
  }

  return isValid;
}

async function execute() {
  if (args[2] !== "-E") {
    console.log("Expected first argument to be '-E'");
    process.exit(1);
  }

  const inputString = await new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
  });

  if (doesPatternMatch(inputString, regexPattern)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

execute();
