from solution import eliminate_maximum


def test_eliminate_maximum_all_monsters():
    assert eliminate_maximum([1, 3, 4], [1, 1, 1]) == 3


def test_eliminate_maximum_one_monster():
    assert eliminate_maximum([1, 1, 2, 3], [1, 1, 1, 1]) == 1


def test_eliminate_maximum_fast_monsters():
    assert eliminate_maximum([3, 2, 4], [5, 3, 2]) == 1
