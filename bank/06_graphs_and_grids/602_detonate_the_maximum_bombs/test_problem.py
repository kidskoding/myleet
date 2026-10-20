from solution import maximum_detonation


def test_maximum_detonation_one_direction():
    assert maximum_detonation([[2, 1, 3], [6, 1, 4]]) == 2


def test_maximum_detonation_far_apart():
    assert maximum_detonation([[1, 1, 5], [10, 10, 5]]) == 1


def test_maximum_detonation_chain():
    assert maximum_detonation([[1, 2, 3], [2, 3, 1], [3, 4, 2], [4, 5, 3], [5, 6, 4]]) == 5


def test_maximum_detonation_single():
    assert maximum_detonation([[7, 7, 1]]) == 1


def test_maximum_detonation_edge_of_radius_counts():
    assert maximum_detonation([[0, 0, 5], [3, 4, 5]]) == 2


def test_maximum_detonation_large_coordinates():
    assert maximum_detonation([[1, 1, 100000], [100000, 100000, 1]]) == 1
