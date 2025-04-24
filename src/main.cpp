#include <iostream>
#include <string>
#include "regex.hpp"

auto main(int argc, char* argv[]) -> int {
  if (argc != 3) {
    std::cerr << "usage: regex -E <pattern>" << "\n";
    return EXIT_FAILURE;
  }

  const std::string flag = argv[1];
  const std::string pattern = argv[2];

  if (flag != "-E") {
    std::cerr << "error: first argument must be '-E'" << "\n";
    return EXIT_FAILURE;
  }

  std::string input_line;
  if (!std::getline(std::cin, input_line)) {
    std::cerr << "error: failed to read input line" << "\n";
    return EXIT_FAILURE;
  }

  try {
    // RegexEngine engine;
    // return engine.match(input_line, pattern) ? EXIT_SUCCESS : EXIT_FAILURE;
  } catch (const std::exception& e) {
    std::cerr << "error: " << e.what() << "\n";
    return EXIT_FAILURE;
  }
}
