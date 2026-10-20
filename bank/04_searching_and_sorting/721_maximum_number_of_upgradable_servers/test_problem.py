from solution import max_upgrades


def test_max_upgrades_two_centers():
    assert max_upgrades([4, 3], [3, 5], [4, 2], [8, 9]) == [3, 2]


def test_max_upgrades_cannot_afford_any():
    assert max_upgrades([1], [2], [1], [1]) == [0]


def test_max_upgrades_rich_enough_for_all():
    assert max_upgrades([5], [1], [1], [100]) == [5]


def test_max_upgrades_must_sell_half():
    assert max_upgrades([4], [3], [3], [0]) == [2]


def test_max_upgrades_exact_budget():
    assert max_upgrades([3, 2], [2, 10], [1, 1], [3, 0]) == [2, 0]
