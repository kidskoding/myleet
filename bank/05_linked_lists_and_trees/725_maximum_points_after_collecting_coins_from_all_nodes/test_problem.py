from solution import maximum_points


def test_maximum_points_mix_of_choices():
    assert maximum_points([[0, 1], [1, 2], [2, 3]], [10, 10, 3, 3], 5) == 11


def test_maximum_points_zero_k_keeps_everything():
    assert maximum_points([[0, 1], [0, 2]], [8, 4, 4], 0) == 16


def test_maximum_points_halve_root_helps_subtree():
    assert maximum_points([[0, 1]], [2, 4], 10) == 2


def test_maximum_points_all_zero_coins():
    assert maximum_points([[0, 1], [1, 2]], [0, 0, 0], 3) == 0


def test_maximum_points_star():
    assert maximum_points([[0, 1], [0, 2], [0, 3]], [1, 20, 20, 20], 5) == 41
