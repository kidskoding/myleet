from solution import get_maximum_xor


def test_get_maximum_xor_example_one():
    assert get_maximum_xor([0, 1, 1, 3], 2) == [0, 3, 2, 3]


def test_get_maximum_xor_example_two():
    assert get_maximum_xor([2, 3, 4, 7], 3) == [5, 2, 6, 5]


def test_get_maximum_xor_example_three():
    assert get_maximum_xor([0, 1, 2, 2, 5, 7], 3) == [4, 3, 6, 4, 6, 7]


def test_get_maximum_xor_single():
    assert get_maximum_xor([0], 1) == [1]
