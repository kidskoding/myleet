from solution import num_pairs_divisible_by_60


def test_num_pairs_divisible_by_60_example_mixed():
    assert num_pairs_divisible_by_60([30, 20, 150, 100, 40]) == 3


def test_num_pairs_divisible_by_60_example_all_sixty():
    assert num_pairs_divisible_by_60([60, 60, 60]) == 3


def test_num_pairs_divisible_by_60_single_song():
    assert num_pairs_divisible_by_60([60]) == 0


def test_num_pairs_divisible_by_60_two_pairs():
    assert num_pairs_divisible_by_60([20, 40, 30, 90]) == 2


def test_num_pairs_divisible_by_60_none():
    assert num_pairs_divisible_by_60([1, 2, 3]) == 0
