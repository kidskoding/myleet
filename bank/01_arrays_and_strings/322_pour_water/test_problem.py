from solution import pour_water


def test_pour_water_example():
    assert pour_water([2, 1, 1, 2, 1, 2, 2], 4, 3) == [2, 2, 2, 3, 2, 2, 2]


def test_pour_water_prefers_left_then_right():
    assert pour_water([1, 2, 3, 4], 2, 2) == [2, 3, 3, 4]


def test_pour_water_fills_valley():
    assert pour_water([3, 1, 3], 5, 1) == [4, 4, 4]


def test_pour_water_no_volume():
    assert pour_water([1, 2, 1], 0, 1) == [1, 2, 1]


def test_pour_water_flat_stays_put():
    assert pour_water([1, 1, 1], 1, 1) == [1, 2, 1]


def test_pour_water_nearest_of_equal_lows():
    assert pour_water([1, 1, 2, 3], 1, 3) == [1, 2, 2, 3]
