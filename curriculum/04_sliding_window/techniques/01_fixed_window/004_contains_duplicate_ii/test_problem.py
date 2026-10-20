from solution import contains_nearby_duplicate


def test_contains_nearby_duplicate_within_k():
    assert contains_nearby_duplicate([1, 2, 3, 1], 3) is True


def test_contains_nearby_duplicate_outside_k():
    assert contains_nearby_duplicate([1, 2, 3, 1, 2, 3], 2) is False


def test_contains_nearby_duplicate_adjacent():
    assert contains_nearby_duplicate([1, 0, 1, 1], 1) is True
