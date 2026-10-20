from solution import max_coins


def test_max_coins_normal():
    assert max_coins([3, 1, 5, 8]) == 167


def test_max_coins_single_balloon():
    assert max_coins([5]) == 5


def test_max_coins_empty():
    assert max_coins([]) == 0
