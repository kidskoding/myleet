from solution import distance


def test_distance_example_one():
    assert distance([1, 3, 1, 1, 2]) == [5, 0, 3, 4, 0]


def test_distance_all_distinct():
    assert distance([0, 5, 3]) == [0, 0, 0]


def test_distance_single():
    assert distance([7]) == [0]


def test_distance_pair():
    assert distance([2, 2]) == [1, 1]


def test_distance_all_same():
    assert distance([1, 1, 1, 1]) == [6, 4, 4, 6]


def test_distance_two_interleaved_groups():
    assert distance([1, 2, 1, 2, 1]) == [6, 2, 4, 2, 6]
