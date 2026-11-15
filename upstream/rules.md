# le.gume rules

version: 29d863e
source: https://james-gibson.github.io/le.gume/rules.md

A child seed defers to this list until it records a local override.
An override names a rule id, gives a reason, and is published by the child.

- RULES-01: The path is the URL. A rename is a breaking public change.
- RULES-02: Navigation is derived from the content tree; there is no nav array.
- RULES-03: Content is Markdown, never MDX. A live widget is a route in src/pages/.
- RULES-04: llms.txt is generated; never hand-edit it.
- RULES-05: The guard is the gate. Weakening a check invalidates every other claim.
- RULES-06: A claim that the site does X must be checkable at the URL or in the repository.
- RULES-07: Child seeds ship back: package a new capability as an isotope and propose it upstream.
- RULES-08: A child seed defers to these rules until it records a local override, with a reason.
