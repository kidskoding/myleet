from solution import max_distance


def test_max_distance_normal():
    assert max_distance([1, 2, 3, 4, 7], 3) == 3


def test_max_distance_two_baskets():
    assert max_distance([5, 4, 3, 2, 1, 1000000000], 2) == 999999999
