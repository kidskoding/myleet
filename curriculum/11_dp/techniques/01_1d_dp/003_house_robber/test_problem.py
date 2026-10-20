from solution import rob


def test_rob_empty():
    assert rob([]) == 0


def test_rob_single():
    assert rob([5]) == 5


def test_rob_normal():
    assert rob([1, 2, 3, 1]) == 4


def test_rob_alternating_better():
    assert rob([2, 7, 9, 3, 1]) == 12
