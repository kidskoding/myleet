from solution import max_coins


def test_max_coins_two_switches():
    assert max_coins([1, -2, -10, 3], [-5, 10, 0, 1]) == 14


def test_max_coins_one_switch():
    assert max_coins([1, -1, -1, -1], [0, 3, 4, -5]) == 8


def test_max_coins_switch_on_entry():
    assert max_coins([-5, -4, -3], [-1, 2, 3]) == 5


def test_max_coins_third_switch_not_allowed():
    assert max_coins([-3, -3, -3], [9, -2, 4]) == 11


def test_max_coins_must_drive_one_mile():
    assert max_coins([-10], [-2]) == -2


def test_max_coins_limited_switches_between_bonuses():
    assert max_coins([1, 1, 1, 1, 1], [-1, 5, -1, 5, -1]) == 11


def test_max_coins_large_values():
    assert max_coins([10**9] * 10**5, [-(10**9)] * 10**5) == 10**14
