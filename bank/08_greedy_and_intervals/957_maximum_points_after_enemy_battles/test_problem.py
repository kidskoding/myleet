from solution import maximum_points


def test_maximum_points_example_one():
    assert maximum_points([3, 2, 2], 2) == 3


def test_maximum_points_single_enemy():
    assert maximum_points([2], 10) == 5


def test_maximum_points_too_weak():
    assert maximum_points([5], 4) == 0


def test_maximum_points_zero_energy():
    assert maximum_points([1, 2], 0) == 0


def test_maximum_points_absorb_others():
    assert maximum_points([3, 1, 4], 2) == 9
