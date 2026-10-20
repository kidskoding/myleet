from solution import max_count


def test_max_count_example_one():
    assert max_count([1, 4, 6], 6, 4) == 1


def test_max_count_skips_gap():
    assert max_count([4, 3, 5, 6], 7, 18) == 3


def test_max_count_nothing_fits():
    assert max_count([2], 5, 0) == 0


def test_max_count_everything_fits():
    assert max_count([3], 5, 100) == 4


def test_max_count_huge_range():
    assert max_count([1], 1000000000, 1000000000000000) == 44721358


def test_max_count_bans_beyond_n():
    assert max_count([100, 200], 10, 15) == 5
