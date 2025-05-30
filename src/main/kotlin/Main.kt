package np.com.sudanchapagain

import java.io.File

/**
 * represents ast for regex.
 * Literal represents actual literal characters (eg: 'a')
 * CharacterClass represents type of character with set holding each member of the character set (eg: a to z, A to Z, 0 to 9)
 * Star represents kleene star (matches zero or more occurrences of a sub-pattern)
 * Plus represents kleene plus (matches one or more ,, ,, ,,)
 * QuestionMark represents optional operator (?), which matches zero or one occurrence of a sub-pattern.
 * Group represents a group (duh) (e.g., (abc)), which is used to group part of a regex for applying quantifiers,
 *   alternation, or capturing. subPattern holds the pattern inside the group.
 * Or represents alternation (|) which matches either the left or right sub-pattern.
 * Concat represents concatenation where two patterns are matched in sequence.
 */
sealed class RegexNode

data class Literal(val char: Char) : RegexNode()
data class CharacterClass(val set: Set<Char>) : RegexNode()
data class Star(val subPattern: RegexNode) : RegexNode()
data class Plus(val subPattern: RegexNode) : RegexNode()
data class QuestionMark(val subPattern: RegexNode) : RegexNode()
data class Group(val subPattern: RegexNode) : RegexNode()
data class Or(val left: RegexNode, val right: RegexNode) : RegexNode()
data class Concat(val left: RegexNode, val right: RegexNode) : RegexNode()

fun processFile(filePath: String): String {
    return try {
        File(filePath).readText()
    } catch (e: Exception) {
        println("error reading file: ${e.message}")
        ""
    }
}

class RegexParser(private val input: String) {
    private var index = 0

    // return either the value at index or null
    private fun peek(): Char? = if (index < input.length) input[index] else null

    // return the value of current idx and increase index by + 1 or null if no chars left.
    private fun consume(): Char? {
        val char = peek()
        if (char != null) {
            index++
        }
        return char
    }

    // parse a regex pattern, handling alternation (|) between terms as calls to process both left and right
    private fun parsePattern(): RegexNode {
        var left = parseTerm()
        while (peek() != null && peek()!! !in "|)*") {
            val right = parseFactor()
            left = Concat(left, right)
        }
        return left
    }

    // parse a term in a regex pattern, handling quantifiers (*, +, ?).
    // parseFactor parses a literal or group or character class or etc.
    // if a quantifier is found (*, +, ?), it wraps the parsed factor with the appropriate operator.
    private fun parseTerm(): RegexNode {
        var left = parseFactor()
        while (peek()!! in "*+?") {
            val operator = consume()!!
            left = when (operator) {
                '*' -> Star(left)
                '+' -> Plus(left)
                '?' -> QuestionMark(left)
                else -> throw IllegalArgumentException("unexpected operator: $operator")
            }
        }
        return left
    }

    // identifies the type of factor based on the current character and processes it accordingly.
    private fun parseFactor(): RegexNode {
        return when {
            peek()?.isLetterOrDigit() == true -> {
                val char = consume()!!
                Literal(char)
            }
            peek() == '[' -> {
                consume() // consume '['
                val characterClass = parseCharacterClass()
                consume() // consume ']'
                CharacterClass(characterClass)
            }
            peek() == '(' -> {
                consume() // consume '('
                val subPattern = parsePattern()
                consume() // consume ')'
                Group(subPattern)
            }
            peek() == '\\' -> {
                consume() // consume '\'
                parseEscapeSequence()
            }
            else -> throw IllegalArgumentException("unexpected character: ${peek()}")
        }
    }

    // parse a character class (e.g., [a-z], [0-9], [abc]) in a regex pattern &
    // process the characters inside the class and add them to a set.
    private fun parseCharacterClass(): Set<Char> {
        val charSet = mutableSetOf<Char>()
        while (peek() != ']') {
            val char = consume()!!
            charSet.add(char)
        }
        return charSet
    }

    // parse escape sequences (e.g., \d, \w, \t, \n, \\).
    private fun parseEscapeSequence(): RegexNode {
        return when (val escapeChar = consume()) {
            'd' -> CharacterClass(('0'..'9').toSet())
            'w' -> CharacterClass(('A'..'Z').toSet() + ('a'..'z').toSet() + ('0'..'9').toSet() + setOf('_'))
            't' -> Literal('\t')
            'n' -> Literal('\n')
            '\\' -> Literal('\\')
            else -> throw IllegalArgumentException("invalid escape sequence: \\$escapeChar")
        }
    }

    // initiates the parsing & function returns the root node of the parsed regex ast.
    fun parse(): RegexNode {
        return parsePattern()
    }
}

fun match(node: RegexNode, text: String, start: Int): Boolean {
    if (start > text.length) return false

    return when (node) {
        // match a literal character at the current position in the text
        is Literal -> start < text.length && text[start] == node.char
        // match a character from the character class at the current position
        is CharacterClass -> start < text.length && text[start] in node.set
        // match zero or more occurrences (kleene star)
        is Star -> matchStar(node, text, start)
        // match one or more occurrences (kleene plus)
        is Plus -> matchPlus(node, text, start)
        // match zero or one occurrence (optional operator)
        is QuestionMark -> matchQuestionMark(node, text, start)
        // match the pattern inside a group (sub-pattern matching)
        is Group -> match(node.subPattern, text, start)
        // match either the left or right sub-pattern (alternation)
        is Or -> match(node.left, text, start) || match(node.right, text, start)
        // match the left sub-pattern followed by the right (concatenation)
        is Concat -> matchConcat(node, text, start)
    }
}

// the star matches zero or more occurrences of the sub-pattern.
// it continues to match the sub-pattern at the next position in the text until no match is found.
// the function returns true if at least one match is found, otherwise false.
fun matchStar(node: Star, text: String, start: Int): Boolean {
    var i = start
    while (i <= text.length && match(node.subPattern, text, i)) {
        i++
    }
    // backtrack to see if the remaining part of the text matches
    while (i >= start) {
        if (match(node.subPattern, text, i)) {
            return true
        }
        i--
    }
    return start == text.length || match(node.subPattern, text, start)
}

// the plus matches one or more occurrences of the sub-pattern.
// it first checks if the sub-pattern matches at least once,
// then continues to match it at the next positions.
fun matchPlus(node: Plus, text: String, start: Int): Boolean {
    if (!match(node.subPattern, text, start)) return false
    var i = start + 1
    while (i <= text.length && match(node.subPattern, text, i)) {
        if (match(node, text, i + 1)) return true // recursively test
        i++
    }
    return true
}

// the function returns true if the sub-pattern matches or if the start position is
// already at the end of the text (no characters left).
fun matchQuestionMark(node: QuestionMark, text: String, start: Int): Boolean {
    return match(node.subPattern, text, start) || start == text.length
}

// match the sub-patterns in sequence first the left pattern, then the right pattern.
fun matchConcat(node: Concat, text: String, start: Int): Boolean {
    val leftLength = matchLength(node.left, text, start)
    if (leftLength == 0) {
        return false
    }
    val rightStart = start + leftLength
    return match(node.right, text, rightStart)
}

// return the length of matched substring based on regex node type.
fun matchLength(regexNode: RegexNode, text: String, startIndex: Int): Int {
    return when (regexNode) {
        is Literal -> if (startIndex < text.length && text[startIndex] == regexNode.char) { 1 } else { 0 }
        is CharacterClass -> if (startIndex < text.length && text[startIndex] in regexNode.set) { 1 } else { 0 }
        is Star -> calculateStarMatchLength(regexNode, text, startIndex)
        is Plus -> calculatePlusMatchLength(regexNode, text, startIndex)
        is QuestionMark -> matchLength(regexNode.subPattern, text, startIndex).coerceAtMost(1)
        is Group -> matchLength(regexNode.subPattern, text, startIndex)
        is Or -> calculateOrMatchLength(regexNode, text, startIndex)
        is Concat -> calculateConcatMatchLength(regexNode, text, startIndex)
    }
}

// calculate match length for kleene star (zero or more occurrences).
fun calculateStarMatchLength(node: Star, text: String, startIndex: Int): Int {
    var matchLength = 0
    var subMatchLength = matchLength(node.subPattern, text, startIndex)
    while (subMatchLength > 0) {
        matchLength += subMatchLength
        subMatchLength = matchLength(node.subPattern, text, startIndex + matchLength)
    }
    return matchLength
}

// calculate match length for kleene plus (one or more occurrences).
fun calculatePlusMatchLength(node: Plus, text: String, startIndex: Int): Int {
    var matchLength = matchLength(node.subPattern, text, startIndex)
    if (matchLength == 0) return 0
    var subMatchLength = matchLength
    while (subMatchLength > 0) {
        subMatchLength = matchLength(node.subPattern, text, startIndex + matchLength)
        matchLength += subMatchLength
    }
    return matchLength
}

// calculate match length for alternation (either left or right match).
fun calculateOrMatchLength(node: Or, text: String, startIndex: Int): Int {
    val leftLength = matchLength(node.left, text, startIndex)

    return if (leftLength > 0) {
        leftLength
    } else {
        matchLength(node.right, text, startIndex)
    }
}

// calculate match length for concatenation (left followed by right).
fun calculateConcatMatchLength(node: Concat, text: String, startIndex: Int): Int {
    val leftLength = matchLength(node.left, text, startIndex)

    if (leftLength > 0) {
        val rightLength = matchLength(node.right, text, startIndex + leftLength)
        if (rightLength > 0) {
            return leftLength + rightLength
        }
    }
    return 0
}

fun main(args: Array<String>) {
    if (args.size != 2) {
        println("usage: <regex-pattern> <file-path>")
        return
    }

    val regexPattern = args[0]
    val filePath = args[1]

    val fileContent = processFile(filePath)
    if (fileContent.isEmpty()) {
        println("error! file content is empty or could not be read.")
        return
    }

    val parser = RegexParser(regexPattern)
    try {
        val parsedTree = parser.parse()
        println("parsed tree: $parsedTree")
    } catch (e: Exception) {
        println("parsing failed: ${e.message}")
    }
}
