const commandLineArgs = process.argv;
const regexPattern = commandLineArgs[3];

function isNumberCharacter(character) {
  return character >= "0" && character <= "9";
}

function isValidCharacter(character) {
  return (
    (character >= "A" && character <= "z") ||
    character === "_" ||
    (character >= "0" && character <= "9")
  );
}

function parseRegexPattern(pattern) {
  const patternCharacters = pattern.split("");

  let hasStartAnchor = false;
  let hasEndAnchor = false;

  const matchedGroups = [];
  const parsedTokens = [];

  while (patternCharacters.length > 0) {
    const currentCharacter = patternCharacters.shift();
    const nextCharacter = patternCharacters[0];

    if (currentCharacter === "^") {
      hasStartAnchor = true;
    } else if (currentCharacter === "$") {
      hasEndAnchor = true;
    } else if (currentCharacter === "+") {
      const previousToken = parsedTokens[parsedTokens.length - 1];
      parsedTokens[parsedTokens.length - 1] = (
        character,
        remainingCharacters
      ) => {
        if (!previousToken(character, []).valid) {
          return { valid: false };
        }
        character = remainingCharacters[0];
        while (character && previousToken(character, []).valid) {
          remainingCharacters.splice(0, 1);
          character = remainingCharacters[0];
        }
        return { valid: true };
      };
    } else if (currentCharacter === "?") {
      const previousToken = parsedTokens[parsedTokens.length - 1];
      parsedTokens[parsedTokens.length - 1] = (
        character,
        remainingCharacters
      ) => {
        const previousResult = previousToken(character, []);
        if (previousResult.valid) {
          return previousResult;
        }
        return { valid: true, returnCharacter: true };
      };
    } else if (currentCharacter === ".") {
      parsedTokens.push((character, remainingCharacters) => ({ valid: true }));
    } else if (currentCharacter === "\\") {
      if (["d", "w"].includes(nextCharacter)) {
        patternCharacters.shift();
        if (nextCharacter === "d") {
          parsedTokens.push((character, remainingCharacters) => ({
            valid: [character].some(isNumberCharacter),
          }));
        } else if (nextCharacter === "w") {
          parsedTokens.push((character, remainingCharacters) => ({
            valid: [character].some(isValidCharacter),
          }));
        }
      } else if (isNumberCharacter(nextCharacter)) {
        patternCharacters.shift();
        parsedTokens.push((character, remainingCharacters) => {
          const matchedGroup = matchedGroups[+nextCharacter - 1];
          const inputSubstring = [character, ...remainingCharacters].join("");
          if (matchedGroup && inputSubstring.startsWith(matchedGroup)) {
            remainingCharacters.splice(0, matchedGroup.length - 1);
            return { valid: true };
          } else {
            return { valid: false };
          }
        });
      }
    } else if (currentCharacter === "[") {
      const isInvertedSet = nextCharacter !== "^";
      if (!isInvertedSet) {
        patternCharacters.shift();
      }
      const substringOffset = pattern.length - patternCharacters.length;
      const closingBracketIndex = pattern
        .substring(substringOffset)
        .indexOf("]");
      if (closingBracketIndex === -1) {
        console.error("Missing closing bracket");
        process.exit(2);
        throw new Error("Missing closing bracket");
      }
      const characterSet = pattern.substring(
        substringOffset,
        substringOffset + closingBracketIndex
      );
      patternCharacters.splice(0, characterSet.length + 1);
      const validCharacters = new Set(characterSet.split(""));
      parsedTokens.push((character, remainingCharacters) => {
        const hasValidCharacter = [character, ...remainingCharacters].some(
          (char) => validCharacters.has(char)
        );
        if (isInvertedSet ? hasValidCharacter : !hasValidCharacter) {
          remainingCharacters.splice(0, remainingCharacters.length);
          return { valid: true };
        }
        return { valid: false };
      });
    } else if (currentCharacter === "(") {
      const substringOffset = pattern.length - patternCharacters.length;
      const closingParenthesisIndex = pattern
        .substring(substringOffset)
        .indexOf(")");
      if (closingParenthesisIndex === -1) {
        console.error("Missing closing parenthesis");
        process.exit(2);
        throw new Error("Missing closing parenthesis");
      }
      const groupPattern = pattern.substring(
        substringOffset,
        substringOffset + closingParenthesisIndex
      );
      patternCharacters.splice(0, groupPattern.length + 1);
      if (groupPattern.includes("|")) {
        const alternatives = groupPattern.split("|");
        parsedTokens.push((character, remainingCharacters) => {
          const inputSubstring = [character, ...remainingCharacters].join("");
          let matchedAlternative;
          for (const alternative of alternatives) {
            const subPatternMatch = matchRegexPattern(
              inputSubstring,
              alternative
            );
            if (
              typeof subPatternMatch !== "boolean" &&
              subPatternMatch.result &&
              subPatternMatch.matchedGroup
            ) {
              matchedAlternative = subPatternMatch.matchedGroup;
              break;
            }
          }
          if (!matchedAlternative) {
            return { valid: false };
          }
          if (!inputSubstring.startsWith(matchedAlternative)) {
            return { valid: false };
          }
          matchedGroups.push(matchedAlternative);
          remainingCharacters.splice(0, matchedAlternative.length - 1);
          return { valid: true };
        });
      } else {
        parsedTokens.push((character, remainingCharacters) => {
          const inputSubstring = [character, ...remainingCharacters].join("");
          const subPatternMatch = matchRegexPattern(
            inputSubstring,
            groupPattern
          );
          if (
            typeof subPatternMatch === "boolean" ||
            !subPatternMatch.result ||
            !subPatternMatch.matchedGroup
          ) {
            return { valid: false };
          }
          if (!inputSubstring.startsWith(subPatternMatch.matchedGroup)) {
            return { valid: false };
          }
          matchedGroups.push(subPatternMatch.matchedGroup);
          remainingCharacters.splice(
            0,
            subPatternMatch.matchedGroup.length - 1
          );
          return { valid: true };
        });
      }
    } else {
      parsedTokens.push((character, remainingCharacters) => ({
        valid: character === currentCharacter,
      }));
    }
  }

  return { hasStartAnchor, hasEndAnchor, parsedTokens };
}

function matchRegexPattern(inputString, pattern) {
  if (pattern.length === 1) {
    return inputString.includes(pattern);
  } else if (pattern === "\\d") {
    return [...inputString].some(isNumberCharacter);
  } else if (pattern === "\\w") {
    return [...inputString].some(isValidCharacter);
  } else if (pattern[0] === "[" && pattern[pattern.length - 1] === "]") {
    const isInvertedSet = pattern[1] !== "^";
    const substringOffset = isInvertedSet ? 1 : 2;
    const validCharacters = new Set(
      pattern.substring(substringOffset, pattern.length - 1).split("")
    );
    const hasValidCharacter = [...inputString].some((character) =>
      validCharacters.has(character)
    );
    return isInvertedSet ? hasValidCharacter : !hasValidCharacter;
  }

  const { hasStartAnchor, hasEndAnchor, parsedTokens } =
    parseRegexPattern(pattern);

  let matchStartIndex = 0;
  let remainingCharacters = inputString.split("");
  let isMatchValid = hasStartAnchor;
  let hasMatchStarted = hasStartAnchor;

  while (remainingCharacters.length) {
    const currentCharacter = remainingCharacters.shift();

    if (!hasMatchStarted) {
      if (parsedTokens[0](currentCharacter, remainingCharacters).valid) {
        hasMatchStarted = true;
        isMatchValid = true;
        parsedTokens.splice(0, 1);
        if (!parsedTokens.length) {
          if (
            hasEndAnchor &&
            inputString.length - remainingCharacters.length < inputString.length
          ) {
            isMatchValid = false;
          }
          break;
        }
      } else {
        matchStartIndex++;
      }
    } else {
      const tokenParseResult = parsedTokens[0]?.(
        currentCharacter,
        remainingCharacters
      );
      if (tokenParseResult?.valid) {
        parsedTokens.splice(0, 1);
        if (tokenParseResult.returnCharacter) {
          remainingCharacters.unshift(currentCharacter);
        }
        if (!parsedTokens.length) {
          if (
            hasEndAnchor &&
            inputString.length - remainingCharacters.length < inputString.length
          ) {
            isMatchValid = false;
          }
          break;
        }
      } else {
        remainingCharacters.unshift(currentCharacter);
        isMatchValid = false;
        break;
      }
    }
  }

  if (parsedTokens.length) {
    return false;
  }

  return {
    result: isMatchValid,
    matchedGroup: inputString.substring(
      matchStartIndex,
      inputString.length - remainingCharacters.length
    ),
  };
}

async function execute() {
  if (commandLineArgs[2] !== "-E") {
    console.log("Expected first argument to be '-E'");
    process.exit(1);
  }

  const inputString = await new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setEncoding("utf8");
    let data = "";
    stdin.on("data", (chunk) => (data += chunk));
    stdin.on("end", () => resolve(data.trim()));
  });

  const result = matchRegexPattern(inputString, regexPattern);

  if (typeof result === "boolean" ? result : result.result) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

execute();
