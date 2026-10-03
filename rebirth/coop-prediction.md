# Multiplayer prediction

The browser keeps input sampling, HTTP requests and rendering on the main thread. A dedicated module worker runs the same combat simulation used by the server. Generation and sequence numbers reject replies from an older authoritative snapshot. If worker loading or computation fails, the existing bounded main-thread prediction takes over.

The worker uses the generated worker-sim directory because document import maps do not apply inside a Worker. After changing any combat simulation module, run:

    node rebirth/build-coop-worker.mjs

Commit the generated modules together with the source change. For releases, bump the worker version in the build script, prediction bridge/core/worker import URLs, and the HTML import map. The generated modules must match the deployed server combat rules.

Only presentation hides allied skill effects. All actors, attacks, healing, shields and boss hazards remain in the simulation. Short local effects created while catching up are sent with the worker result and retained until displayed; lasting fields are not restarted.
