#include <cstdio>

#include "ragdoll_probe.hpp"

int main() {
  const int failures = ragdoll_probe();
  if (failures == 0) std::puts("ragdoll_engine_probe: ok");
  return failures == 0 ? 0 : 1;
}
