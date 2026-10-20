from solution import rand10


def test_rand10_stays_in_range():
    assert all(1 <= rand10() <= 10 for _ in range(200))


def test_rand10_covers_the_range():
    assert len({rand10() for _ in range(2000)}) == 10
