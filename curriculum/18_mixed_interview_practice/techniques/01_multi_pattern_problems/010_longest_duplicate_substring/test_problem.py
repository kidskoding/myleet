from solution import longest_dup_substring


def test_longest_dup_substring_normal():
    assert longest_dup_substring("banana") == "ana"


def test_longest_dup_substring_none():
    assert longest_dup_substring("abcd") == ""
