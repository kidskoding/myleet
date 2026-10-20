---
name: problem-set-tests-scaffold
description: 'Use when adding a problem folder to this DSA repo, or writing or fixing its tests (e.g. "add Koko Eating Bananas to binary search", "scaffold three heap problems", "write the tests for this problem"), to reproduce the exact problem.toml fields, starter header, test import style, and shared-helper convention so the myleet trainer loads and runs it.'
---

# Problem Folder Scaffold

The mechanical convention for one problem under
`curriculum/NN_module/techniques/NN_<technique>/`. `dsa-curriculum-workflow`
decides *which problems* go where; this skill nails the *exact files* so
`myleet validate` loads the problem and `myleet` can run its tests.

## When To Use

- "Add <problem> to <module>" or "scaffold N problems for <technique>".
- "Write the tests" for an existing problem folder.
- A problem fails `myleet validate`, or its tests error at collection instead of
  failing on assertions.

## Folder Layout

```text
curriculum/07_trees/techniques/03_bfs_levels/023_binary_tree_right_side_view/
├── problem.toml
├── starter.py
├── test_problem.py
└── solution.py          optional reference solution
```

- Folder name: `NNN_<snake_slug>`. The number sets the order inside the technique,
  roughly easy to hard.
- No `__init__.py`, no `conftest.py`. The trainer stages the files into a scratch
  directory, so nothing in the folder may import a sibling by path.

## `problem.toml`

```toml
id = "binary-tree-right-side-view"          # LeetCode slug; unique across the repo
title = "Binary Tree Right Side View"
difficulty = "medium"                       # easy | medium | hard
leetcode = 199                              # optional
url = "https://leetcode.com/problems/binary-tree-right-side-view/"
key_idea = "BFS by level; keep the last node of each level."
hints = ["Process the queue one level at a time.", "The last node popped per level is visible."]
prompt = ""                                 # markdown problem statement; optional
# time_target = "20m"                       # optional; defaults 15m/30m/45m by difficulty
# say_aloud = ["invariant", "complexity"]   # optional; default brute force/why it dies/complexity
```

- `id` must be unique. If the same LeetCode problem already exists in another
  module, suffix it: `meeting-rooms-ii-intervals`.
- Hints go from gentle to nearly the answer; each reveal costs the learner a clean
  pass, so the first hint should nudge, not solve.
- Playlists find problems by matching the LeetCode slug in `url`, so keep the URL
  canonical.

## `starter.py`

The signature, type hints, a comment header, and `raise NotImplementedError`. Never put the key idea in the starter: it names the technique, so it lives only in `problem.toml`, where the trainer reveals it as the last hint.

```python
from collections import deque

from tree_node import TreeNode


def right_side_view(root: TreeNode | None) -> list[int]:
    # Problem 23: Binary Tree Right Side View

    # Time:
    # Space:

    raise NotImplementedError
```

- Shared node classes come from `curriculum/_lib` by bare module name:
  `from tree_node import TreeNode`, `from list_node import ListNode`.
- A problem that needs its own node type (random pointer, multilevel, N-ary)
  defines it above the function. Put `from __future__ import annotations` first
  when the class refers to itself.
- Design problems are a class with every method stubbed.
- Use `raise NotImplementedError`, never `pass`. The trainer reports a run where
  every failure is `NotImplementedError` as "not started"; `pass` returns `None`
  and looks like a wrong answer.

## `test_problem.py`

```python
from binary_tree import build_tree_from_level_order
from solution import right_side_view


def test_right_side_view_empty():
    assert right_side_view(None) == []


def test_right_side_view_left_leaning():
    assert right_side_view(build_tree_from_level_order([1, 2, 3, None, 5, None, 4])) == [1, 3, 4]
```

- Import the problem's names from `solution`. The trainer copies the learner's
  attempt (or `solution.py` under `myleet check --solutions`) into the scratch dir
  as `solution.py`.
- Never import from another problem. A test that verifies with a second
  problem's function only passes once that problem is solved. Trusted
  verification helpers live in `curriculum/_lib` (`tree_helpers.py` has
  `preorder_traversal` and `inorder_traversal`).
- Small builders used by one problem stay inline in its test file.
- Cover empty, single, normal, and edge cases. Name tests
  `test_<function>_<case>`.
- Compare node identity with `is` when the contract returns an existing node
  (cycle entry, intersection); compare values otherwise.

## Verify

```bash
go run ./cmd/myleet validate                 # the folder loads: toml, files, unique id
go run ./cmd/myleet check --solutions <id>   # only if solution.py exists
```

To see the starter fail the right way, open it in the trainer (`myleet open <id>`):
the test strip should show `not started`, not a collection error.

## Gotchas

- **A collection error looks like one red test.** A typo in an import makes
  pytest report a single error instead of your tests. If the trainer shows `0/1`
  with an `ImportError` line, the problem is the test file, not the solution.
- **Duplicate ids stop the whole catalog from loading.** `myleet validate` lists
  every duplicate; fix them before anything else.
- **Helpers in `_lib` are trusted code.** They are never stubbed and never part
  of the exercise. Do not put a function the learner is meant to write there.
- **Do not name a starter function differently from the test import.** The
  rename only shows up as an `ImportError` at run time.
