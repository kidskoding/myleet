from solution import max_distance


def test_max_distance_example():
    assert max_distance([[1, 2, 3], [4, 5], [1, 2, 3]]) == 4


def test_max_distance_equal_singletons():
    assert max_distance([[1], [1]]) == 0


def test_max_distance_extremes_in_same_array():
    assert max_distance([[1, 10], [2, 3]]) == 8


def test_max_distance_negatives():
    assert max_distance([[-5, -1], [0, 4], [-3]]) == 9


def test_max_distance_later_array_holds_minimum():
    assert max_distance([[3, 4], [5, 6], [-2, 0]]) == 8
