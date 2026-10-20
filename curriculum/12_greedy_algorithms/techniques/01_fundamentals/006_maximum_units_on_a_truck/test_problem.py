from solution import maximum_units


def test_maximum_units_partial_box():
    assert maximum_units([[1, 3], [2, 2], [3, 1]], 4) == 8


def test_maximum_units_full_truck():
    assert maximum_units([[5, 10], [2, 5], [4, 7], [3, 9]], 10) == 91
