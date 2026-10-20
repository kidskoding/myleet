from solution import peak_index_in_mountain_array


def test_peak_index_in_mountain_array_minimal():
    assert peak_index_in_mountain_array([0, 1, 0]) == 1


def test_peak_index_in_mountain_array_longer_descent():
    assert peak_index_in_mountain_array([0, 2, 1, 0]) == 1


def test_peak_index_in_mountain_array_late_peak():
    assert peak_index_in_mountain_array([3, 4, 5, 1]) == 2
