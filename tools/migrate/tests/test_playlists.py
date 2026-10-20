from tools.migrate.playlists import parse_company, playlist_id, render_toml

MD = """# Meta

Meta - Commonly reported LeetCode/HackerRank/live-coding patterns for Meta SWE interviews

Focus: speed, arrays, strings, trees, graphs, heaps, and backtracking.

## Problem Set

01. [Valid Palindrome II](https://leetcode.com/problems/valid-palindrome-ii/)
02. [Simplify Path](https://leetcode.com/problems/simplify-path/)

## Review Modules

- `01_arrays_and_hashing/`
- `07_trees/`
"""


def test_parse_company_md() -> None:
    playlist = parse_company(MD)
    assert playlist["title"] == "Meta"
    assert playlist["focus"] == "speed, arrays, strings, trees, graphs, heaps, and backtracking."
    assert playlist["entries"] == [
        {"title": "Valid Palindrome II", "url": "https://leetcode.com/problems/valid-palindrome-ii/"},
        {"title": "Simplify Path", "url": "https://leetcode.com/problems/simplify-path/"},
    ]
    assert playlist["review_modules"] == ["01_arrays_and_hashing", "07_trees"]


def test_render_round_trips() -> None:
    import tomllib

    playlist = parse_company(MD)
    assert tomllib.loads(render_toml(playlist)) == playlist


def test_playlist_id_flattens_nested_dirs() -> None:
    assert playlist_id("01_meta.md", None) == "01_meta"
    assert playlist_id("21_expedia.md", "other_tech_companies") == "other_tech_companies-21_expedia"


def test_entry_with_trailing_difficulty() -> None:
    md = "# X\n\n## Problem Set\n\n01. [Two Sum](https://leetcode.com/problems/two-sum/) - Easy\n"
    assert parse_company(md)["entries"] == [{"title": "Two Sum", "url": "https://leetcode.com/problems/two-sum/"}]
