from solution import min_operations


def test_min_operations_example_style():
    assert min_operations("abcde", "cdef") == 3


def test_min_operations_identical():
    assert min_operations("abc", "abc") == 0


def test_min_operations_no_common():
    assert min_operations("abc", "xyz") == 6


def test_min_operations_contained():
    assert min_operations("abcdef", "cde") == 3


def test_min_operations_prefix_suffix():
    assert min_operations("aaaa", "aa") == 2
