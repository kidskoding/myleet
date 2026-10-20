from solution import min_length_after_removals


def test_min_length_after_removals_distinct():
    assert min_length_after_removals([1, 2, 3, 4]) == 0


def test_min_length_after_removals_pairs():
    assert min_length_after_removals([1, 1, 2, 2, 3, 3]) == 0


def test_min_length_after_removals_all_equal():
    assert min_length_after_removals([1000000000, 1000000000]) == 2


def test_min_length_after_removals_odd_length():
    assert min_length_after_removals([2, 3, 4, 4, 4]) == 1


def test_min_length_after_removals_single():
    assert min_length_after_removals([1]) == 1


def test_min_length_after_removals_majority():
    assert min_length_after_removals([1, 1, 1, 2]) == 2
