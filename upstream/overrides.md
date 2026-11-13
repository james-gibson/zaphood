# Local overrides

A rule from the upstream list that this child replaces, with the reason. The
guard refuses an override that names a rule the upstream does not define, and
the build publishes the effective list at `/rules.md`.

- RULES-06: provenance is checked by review, not by the guard — run records are
  not committed yet, so the build cannot verify a version, seed or scenario.
