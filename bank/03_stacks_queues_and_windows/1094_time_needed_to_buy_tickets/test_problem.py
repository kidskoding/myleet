from solution import time_required_to_buy


def test_time_required_to_buy_last_person():
    assert time_required_to_buy([2, 3, 2], 2) == 6


def test_time_required_to_buy_first_person():
    assert time_required_to_buy([5, 1, 1, 1], 0) == 8


def test_time_required_to_buy_single_person():
    assert time_required_to_buy([3], 0) == 3


def test_time_required_to_buy_all_ones():
    assert time_required_to_buy([1, 1, 1], 1) == 2


def test_time_required_to_buy_people_behind_stop_one_short():
    assert time_required_to_buy([3, 4, 3, 5], 2) == 11
