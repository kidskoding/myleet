from solution import contains_nearby_almost_duplicate


def test_contains_nearby_almost_duplicate_exact_repeat():
    assert contains_nearby_almost_duplicate([1, 2, 3, 1], 3, 0) is True


def test_contains_nearby_almost_duplicate_values_too_far_apart():
    assert contains_nearby_almost_duplicate([1, 5, 9, 1, 5, 9], 2, 3) is False


def test_contains_nearby_almost_duplicate_negative_values():
    assert contains_nearby_almost_duplicate([-3, 3], 2, 4) is False
    assert contains_nearby_almost_duplicate([-1, -1], 1, 0) is True


def test_contains_nearby_almost_duplicate_adjacent_bucket():
    assert contains_nearby_almost_duplicate([10, 100, 11, 9], 1, 2) is True


def test_contains_nearby_almost_duplicate_window_expires():
    assert contains_nearby_almost_duplicate([4, 1, 6, 3], 1, 1) is False
    assert contains_nearby_almost_duplicate([1, 9, 9, 2], 2, 1) is True
    assert contains_nearby_almost_duplicate([1, 9, 9, 1], 1, 0) is True
    assert contains_nearby_almost_duplicate([1, 9, 8, 1], 2, 0) is False
