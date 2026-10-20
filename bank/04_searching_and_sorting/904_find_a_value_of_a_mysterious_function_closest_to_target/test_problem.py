from solution import closest_to_target


def test_closest_to_target_example():
    assert closest_to_target([9, 12, 3, 7, 15], 5) == 2


def test_closest_to_target_all_equal():
    assert closest_to_target([1000000, 1000000, 1000000], 1) == 999999


def test_closest_to_target_reaches_zero():
    assert closest_to_target([1, 2, 4, 8, 16], 0) == 0


def test_closest_to_target_single_exact():
    assert closest_to_target([5], 5) == 0


def test_closest_to_target_single_off():
    assert closest_to_target([5], 3) == 2


def test_closest_to_target_needs_range():
    assert closest_to_target([7, 6, 12], 4) == 0
