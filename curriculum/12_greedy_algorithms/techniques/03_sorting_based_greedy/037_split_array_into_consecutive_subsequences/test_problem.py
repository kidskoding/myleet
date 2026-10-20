from solution import is_possible


def test_is_possible_one_run():
    assert is_possible([1, 2, 3, 3, 4, 5]) is True


def test_is_possible_two_runs():
    assert is_possible([1, 2, 3, 3, 4, 4, 5, 5]) is True


def test_is_possible_too_short():
    assert is_possible([1, 2, 3, 4, 4, 5]) is False
