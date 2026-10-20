from solution import contains_pattern


def test_contains_pattern_single_value_repeated():
    assert contains_pattern([1, 2, 4, 4, 4, 4], 1, 3) is True


def test_contains_pattern_overlapping_choices():
    assert contains_pattern([1, 2, 1, 2, 1, 1, 1, 3], 2, 2) is True


def test_contains_pattern_not_enough_repeats():
    assert contains_pattern([1, 2, 1, 2, 1, 3], 2, 3) is False


def test_contains_pattern_array_too_short():
    assert contains_pattern([2, 2, 2, 2], 2, 3) is False


def test_contains_pattern_copies_must_be_adjacent():
    assert contains_pattern([1, 2, 3, 1, 2], 2, 2) is False


def test_contains_pattern_minimal_array():
    assert contains_pattern([2, 2], 1, 2) is True
