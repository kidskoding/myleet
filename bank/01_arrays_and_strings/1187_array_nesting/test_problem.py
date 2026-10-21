from solution import array_nesting


def test_array_nesting_example():
    assert array_nesting([5, 4, 0, 3, 1, 6, 2]) == 4


def test_array_nesting_identity():
    assert array_nesting([0, 1, 2]) == 1


def test_array_nesting_full_cycle():
    assert array_nesting([1, 2, 0]) == 3


def test_array_nesting_single():
    assert array_nesting([0]) == 1


def test_array_nesting_two_swap():
    assert array_nesting([1, 0]) == 2
