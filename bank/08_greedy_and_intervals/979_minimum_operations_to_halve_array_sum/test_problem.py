from solution import halve_array


def test_halve_array_example_one():
    assert halve_array([5, 19, 8, 1]) == 3


def test_halve_array_example_two():
    assert halve_array([3, 8, 20]) == 3


def test_halve_array_single():
    assert halve_array([1]) == 1


def test_halve_array_two_equal():
    assert halve_array([1, 1]) == 2


def test_halve_array_reuse_largest():
    assert halve_array([10, 1]) == 2
