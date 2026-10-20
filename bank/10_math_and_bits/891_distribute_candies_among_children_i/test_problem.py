from solution import distribute_candies


def test_distribute_candies_tight_limit():
    assert distribute_candies(5, 2) == 3


def test_distribute_candies_loose_limit():
    assert distribute_candies(3, 3) == 10


def test_distribute_candies_impossible():
    assert distribute_candies(10, 3) == 0


def test_distribute_candies_one_candy():
    assert distribute_candies(1, 1) == 3


def test_distribute_candies_exactly_full():
    assert distribute_candies(6, 2) == 1


def test_distribute_candies_limit_not_binding():
    assert distribute_candies(4, 4) == 15
