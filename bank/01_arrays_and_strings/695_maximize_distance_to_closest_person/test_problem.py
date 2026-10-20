from solution import max_dist_to_closest


def test_max_dist_to_closest_middle_gap():
    assert max_dist_to_closest([1, 0, 0, 0, 1, 0, 1]) == 2


def test_max_dist_to_closest_trailing_gap():
    assert max_dist_to_closest([1, 0, 0, 0]) == 3


def test_max_dist_to_closest_leading_gap():
    assert max_dist_to_closest([0, 1]) == 1


def test_max_dist_to_closest_leading_beats_middle():
    assert max_dist_to_closest([0, 0, 1, 0, 0, 0, 1]) == 2


def test_max_dist_to_closest_single_empty_between():
    assert max_dist_to_closest([1, 0, 1]) == 1


def test_max_dist_to_closest_even_gap():
    assert max_dist_to_closest([1, 0, 0, 1]) == 1
