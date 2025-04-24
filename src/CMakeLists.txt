add_library(regex STATIC regex.cpp)

target_include_directories(regex
    PUBLIC ${CMAKE_CURRENT_SOURCE}
)

add_executable(main
    main.cpp
    regex.cpp
    nfa.cpp
    parser.cpp
)
target_link_libraries(main regex)
