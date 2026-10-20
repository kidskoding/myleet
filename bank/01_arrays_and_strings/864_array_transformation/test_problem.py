from solution import transform_array


def test_transform_array_single_valley():
    assert transform_array([6, 2, 3, 4]) == [6, 3, 3, 4]


def test_transform_array_two_days():
    assert transform_array([1, 6, 3, 4, 3, 5]) == [1, 4, 4, 4, 4, 5]


def test_transform_array_already_stable():
    assert transform_array([1, 2, 3]) == [1, 2, 3]


def test_transform_array_peak_flattens():
    assert transform_array([1, 5, 1]) == [1, 1, 1]


def test_transform_array_valley_fills():
    assert transform_array([5, 1, 5]) == [5, 5, 5]


def test_transform_array_zigzag():
    assert transform_array([2, 1, 2, 1, 2]) == [2, 2, 2, 2, 2]
