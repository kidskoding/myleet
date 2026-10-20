from solution import rob_ii


def test_rob_ii_single():
    assert rob_ii([5]) == 5


def test_rob_ii_two_houses():
    assert rob_ii([1, 2]) == 2


def test_rob_ii_normal():
    assert rob_ii([2, 3, 2]) == 3


def test_rob_ii_larger():
    assert rob_ii([1, 2, 3, 1]) == 4
