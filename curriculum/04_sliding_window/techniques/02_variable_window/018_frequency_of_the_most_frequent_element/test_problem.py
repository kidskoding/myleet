from solution import max_frequency


def test_max_frequency_all_equal():
    assert max_frequency([1, 2, 4], 5) == 3


def test_max_frequency_limited():
    assert max_frequency([1, 4, 8, 13], 5) == 2


def test_max_frequency_no_moves_help():
    assert max_frequency([3, 9, 6], 2) == 1
