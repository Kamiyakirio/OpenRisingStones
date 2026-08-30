// Minimal DLL entry point and explicit remote-thread lifecycle exports.
#include "bridge/bootstrap.hpp"
#include "runtime.hpp"

#include <Windows.h>

#include <memory>
#include <mutex>

namespace {

std::mutex g_runtime_mutex;
std::unique_ptr<bridge::Runtime> g_runtime;

}  // namespace

extern "C" __declspec(dllexport) DWORD WINAPI bridge_initialize(void* raw_args) {
  if (!raw_args) return 1;
  std::lock_guard lock(g_runtime_mutex);
  if (g_runtime) {
    if (!g_runtime->is_restartable()) return 2;
    g_runtime->stop();
    g_runtime.reset();
  }
  try {
    const auto args = *static_cast<const bridge::BootstrapArgs*>(raw_args);
    auto runtime = std::make_unique<bridge::Runtime>(args);
    runtime->start();
    g_runtime = std::move(runtime);
    return 0;
  } catch (...) {
    g_runtime.reset();
    return 3;
  }
}

extern "C" __declspec(dllexport) DWORD WINAPI bridge_shutdown(void*) {
  std::unique_ptr<bridge::Runtime> runtime;
  {
    std::lock_guard lock(g_runtime_mutex);
    runtime = std::move(g_runtime);
  }
  if (!runtime) return 0;
  try {
    runtime->stop();
    runtime.reset();
    return 0;
  } catch (...) {
    return 4;
  }
}

BOOL APIENTRY DllMain(HMODULE module, DWORD reason, void*) {
  if (reason == DLL_PROCESS_ATTACH) {
    DisableThreadLibraryCalls(module);
  }
  return TRUE;
}
