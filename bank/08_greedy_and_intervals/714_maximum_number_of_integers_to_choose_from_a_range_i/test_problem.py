from solution import max_count


def test_max_count_example_one():
    assert max_count([1, 6, 5], 5, 6) == 2


def test_max_count_everything_banned():
    assert max_count([1, 2, 3, 4, 5, 6, 7], 8, 1) == 0


def test_max_count_ban_outside_range():
    assert max_count([11], 7, 50) == 7


def test_max_count_sum_too_small():
    assert max_count([10], 5, 0) == 0


def test_max_count_duplicate_bans():
    assert max_count([2, 2, 3], 6, 10) == 3
