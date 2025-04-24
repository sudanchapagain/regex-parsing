default:
    just build

build:
    cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
    cmake --build build

run:
    ./build/bin/main

test:
    cd build && ctest

clean:
    rm -rf build

format:
    clang-format -i src/*.cpp

lint:
    clang-tidy src/*.cpp -- -Iinclude
