from solution import min_days


def test_min_days_single_flower_bouquets():
    assert min_days([1, 10, 3, 10, 2], 3, 1) == 3


def test_min_days_impossible():
    assert min_days([1, 10, 3, 10, 2], 3, 2) == -1


def test_min_days_adjacent_requirement():
    assert min_days([7, 7, 7, 7, 12, 7, 7], 2, 3) == 12
