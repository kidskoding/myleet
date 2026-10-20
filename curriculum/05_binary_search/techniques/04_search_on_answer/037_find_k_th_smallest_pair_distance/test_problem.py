from solution import smallest_distance_pair


def test_smallest_distance_pair_zero_distance():
    assert smallest_distance_pair([1, 3, 1], 1) == 0


def test_smallest_distance_pair_all_equal():
    assert smallest_distance_pair([1, 1, 1], 2) == 0


def test_smallest_distance_pair_largest_gap():
    assert smallest_distance_pair([1, 6, 1], 3) == 5
