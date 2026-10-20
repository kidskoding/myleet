from solution import dist_money


def test_dist_money_one_eight():
    assert dist_money(20, 3) == 1


def test_dist_money_everyone_eight():
    assert dist_money(16, 2) == 2


def test_dist_money_not_enough_money():
    assert dist_money(1, 2) == -1


def test_dist_money_leftover_after_all_eights():
    assert dist_money(30, 3) == 2


def test_dist_money_avoid_four():
    assert dist_money(12, 2) == 0


def test_dist_money_remainder_to_last_child():
    assert dist_money(17, 2) == 1
