cmake_minimum_required(VERSION 3.26)
project(game_bridge_payload VERSION 0.1.0 LANGUAGES CXX)

if(NOT WIN32 OR NOT (CMAKE_SIZEOF_VOID_P EQUAL 8))
  message(FATAL_ERROR "game_bridge_payload requires 64-bit Windows")
endif()

set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>" CACHE STRING "" FORCE)

include(FetchContent)

FetchContent_Declare(
  minhook
  GIT_REPOSITORY https://github.com/TsudaKageyu/minhook.git
  GIT_TAG v1.3.4
  GIT_SHALLOW TRUE
)
FetchContent_Declare(
  nlohmann_json
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG v3.11.3
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(minhook nlohmann_json)

add_library(game_bridge_payload SHARED
  src/address_resolver.cpp
  src/dll_main.cpp
  src/game_runtime.cpp
  src/manifest.cpp
  src/pipe_client.cpp
  src/runtime.cpp
)

target_compile_features(game_bridge_payload PRIVATE cxx_std_20)
target_compile_definitions(game_bridge_payload PRIVATE
  NOMINMAX
  WIN32_LEAN_AND_MEAN
  UNICODE
  _UNICODE
)
target_include_directories(game_bridge_payload PRIVATE include src)
target_link_libraries(game_bridge_payload PRIVATE
  bcrypt
  minhook
  nlohmann_json::nlohmann_json
)

if(MSVC)
  target_compile_options(game_bridge_payload PRIVATE /W4 /WX /permissive- /EHsc /utf-8)
  target_link_options(game_bridge_payload PRIVATE /INCREMENTAL:NO)
else()
  target_compile_options(game_bridge_payload PRIVATE -Wall -Wextra -Werror)
endif()

set_target_properties(game_bridge_payload PROPERTIES
  OUTPUT_NAME "game_bridge_payload"
  PREFIX ""
)
