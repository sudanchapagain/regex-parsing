enable_testing()

add_executable(tests
  test_main.cpp
  test_nfa.cpp
  test_parser.cpp
)

target_include_directories(tests PUBLIC ../src)

add_test(NAME regex_tests COMMAND tests)
