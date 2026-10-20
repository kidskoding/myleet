from solution import get_smallest_string


def test_get_smallest_string_example_one():
    assert get_smallest_string("zbbz", 3) == "aaaz"


def test_get_smallest_string_partial_lowering():
    assert get_smallest_string("xaxcd", 4) == "aawcd"


def test_get_smallest_string_zero_budget():
    assert get_smallest_string("lol", 0) == "lol"


def test_get_smallest_string_wraps_forward():
    assert get_smallest_string("z", 1) == "a"


def test_get_smallest_string_large_budget():
    assert get_smallest_string("mnop", 2000) == "aaaa"


def test_get_smallest_string_already_smallest():
    assert get_smallest_string("aaa", 5) == "aaa"
