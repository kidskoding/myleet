from solution import number_of_subarrays


def test_number_of_subarrays_normal():
    assert number_of_subarrays([1, 1, 2, 1, 1], 3) == 2


def test_number_of_subarrays_no_odds_needed_but_none_present():
    assert number_of_subarrays([2, 4, 6], 1) == 0


def test_number_of_subarrays_normal_two():
    assert number_of_subarrays([2, 2, 2, 1, 2, 2, 1, 2, 2, 2], 2) == 16


def test_number_of_subarrays_single_odd():
    assert number_of_subarrays([1], 1) == 1
