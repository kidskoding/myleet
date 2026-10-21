from solution import string_matching


def test_string_matching_normal():
    assert sorted(string_matching(["mass", "as", "hero", "superhero"])) == sorted(
        ["as", "hero"]
    )


def test_string_matching_leetcode():
    assert sorted(string_matching(["leetcode", "et", "code"])) == sorted(["et", "code"])


def test_string_matching_none():
    assert string_matching(["blue", "green", "bu"]) == []


def test_string_matching_single():
    assert string_matching(["a"]) == []
