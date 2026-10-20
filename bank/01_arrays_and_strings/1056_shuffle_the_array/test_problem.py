from solution import shuffle


def test_shuffle_example_one():
    assert shuffle([2, 5, 1, 3, 4, 7], 3) == [2, 3, 5, 4, 1, 7]


def test_shuffle_example_two():
    assert shuffle([1, 2, 3, 4, 4, 3, 2, 1], 4) == [1, 4, 2, 3, 3, 2, 4, 1]


def test_shuffle_example_three():
    assert shuffle([1, 1, 2, 2], 2) == [1, 2, 1, 2]


def test_shuffle_single_pair():
    assert shuffle([9, 8], 1) == [9, 8]
