from solution import minimum_string


def test_minimum_string_example_one():
    assert minimum_string("abc", "bca", "aaa") == "aaabca"


def test_minimum_string_contained():
    assert minimum_string("ab", "ba", "aba") == "aba"


def test_minimum_string_no_overlaps():
    assert minimum_string("a", "b", "c") == "abc"


def test_minimum_string_nested():
    assert minimum_string("aaa", "aa", "a") == "aaa"


def test_minimum_string_cyclic_overlaps():
    assert minimum_string("ab", "bc", "ca") == "abca"


def test_minimum_string_all_equal():
    assert minimum_string("xyz", "xyz", "xyz") == "xyz"
