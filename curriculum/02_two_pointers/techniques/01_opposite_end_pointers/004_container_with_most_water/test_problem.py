from solution import max_area


def test_max_area_normal():
    assert max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49


def test_max_area_two_elements():
    assert max_area([1, 1]) == 1


def test_max_area_increasing_heights():
    assert max_area([1, 2, 3, 4, 5]) == 6
