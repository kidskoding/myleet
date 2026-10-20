from solution import custom_sort_string


def test_custom_sort_string_all_ordered():
    assert custom_sort_string("cba", "abcd") == "cbad"


def test_custom_sort_string_order_has_extra_letters():
    assert custom_sort_string("bcafg", "abcd") == "bcad"


def test_custom_sort_string_with_repeats():
    assert custom_sort_string("kqep", "pekeq") == "kqeep"


def test_custom_sort_string_empty_input():
    assert custom_sort_string("cba", "") == ""


def test_custom_sort_string_no_overlap():
    """Nothing in order appears in s, so everything is a leftover."""
    assert sorted(custom_sort_string("xyz", "abc")) == ["a", "b", "c"]


def test_custom_sort_string_groups_repeats_together():
    assert custom_sort_string("cba", "aaabbbccc") == "cccbbbaaa"
