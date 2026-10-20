from solution import ways_to_split


def test_ways_to_split_all_ones():
    assert ways_to_split([1, 1, 1]) == 1


def test_ways_to_split_three_ways():
    assert ways_to_split([1, 2, 2, 2, 5, 0]) == 3


def test_ways_to_split_decreasing():
    assert ways_to_split([3, 2, 1]) == 0


def test_ways_to_split_all_zeros():
    assert ways_to_split([0, 0, 0]) == 1
    assert ways_to_split([0, 0, 0, 0]) == 3


def test_ways_to_split_many_zeros():
    assert ways_to_split([0] * 1000) == 498501
