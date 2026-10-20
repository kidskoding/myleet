from solution import distribute_candies


def test_distribute_candies_tight_limit():
    assert distribute_candies(5, 2) == 3


def test_distribute_candies_loose_limit():
    assert distribute_candies(3, 3) == 10


def test_distribute_candies_three_way_correction():
    assert distribute_candies(6, 3) == 10


def test_distribute_candies_impossible():
    assert distribute_candies(100000000, 10000000) == 0


def test_distribute_candies_huge_unbounded():
    assert distribute_candies(100000000, 100000000) == 5000000150000001


def test_distribute_candies_huge_bounded():
    assert distribute_candies(100000000, 40000000) == 200000030000001
