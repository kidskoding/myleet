from solution import distribute_candies


def test_distribute_candies_tight_limit():
    assert distribute_candies(5, 2) == 3


def test_distribute_candies_loose_limit():
    assert distribute_candies(3, 3) == 10


def test_distribute_candies_impossible():
    assert distribute_candies(1000000, 1) == 0


def test_distribute_candies_exactly_full():
    assert distribute_candies(6, 2) == 1


def test_distribute_candies_large_unbounded():
    assert distribute_candies(1000000, 1000000) == 500001500001


def test_distribute_candies_large_bounded():
    assert distribute_candies(1000000, 400000) == 20000300001
