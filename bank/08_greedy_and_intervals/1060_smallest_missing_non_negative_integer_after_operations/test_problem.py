from solution import find_smallest_integer


def test_find_smallest_integer_example_one():
    assert find_smallest_integer([1, -10, 7, 13, 6, 8], 5) == 4


def test_find_smallest_integer_example_two():
    assert find_smallest_integer([1, -10, 7, 13, 6, 8], 7) == 2


def test_find_smallest_integer_single_zero():
    assert find_smallest_integer([0], 1) == 1


def test_find_smallest_integer_value_one():
    assert find_smallest_integer([5, 5], 1) == 2


def test_find_smallest_integer_balanced_residues():
    assert find_smallest_integer([3, 0, 3, 2, 4, 2, 1, 1, 0, 4], 5) == 10


def test_find_smallest_integer_missing_zero_residue():
    assert find_smallest_integer([1, 2, 4], 3) == 0
