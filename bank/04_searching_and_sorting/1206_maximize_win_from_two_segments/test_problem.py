from solution import maximize_win


def test_maximize_win_example_one():
    assert maximize_win([1, 1, 2, 2, 3, 3, 5], 2) == 7


def test_maximize_win_k_zero():
    assert maximize_win([1, 2, 3, 4], 0) == 2


def test_maximize_win_single_prize():
    assert maximize_win([10], 5) == 1


def test_maximize_win_all_covered_by_one():
    assert maximize_win([1, 2, 3], 100) == 3


def test_maximize_win_two_clusters():
    assert maximize_win([1, 1, 1, 100, 100], 0) == 5
