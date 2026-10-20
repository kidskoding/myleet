from solution import best_coordinate


def test_best_coordinate_three_towers():
    assert best_coordinate([[1, 2, 5], [2, 1, 7], [3, 1, 9]], 2) == [2, 1]


def test_best_coordinate_single_tower():
    assert best_coordinate([[23, 11, 21]], 9) == [23, 11]


def test_best_coordinate_strongest_tower_not_best():
    assert best_coordinate([[1, 2, 13], [2, 1, 7], [0, 1, 9]], 2) == [1, 2]


def test_best_coordinate_all_zero_quality_returns_origin():
    assert best_coordinate([[5, 5, 0]], 1) == [0, 0]


def test_best_coordinate_tie_takes_lexicographically_smaller():
    assert best_coordinate([[1, 1, 3], [3, 1, 3]], 2) == [1, 1]
