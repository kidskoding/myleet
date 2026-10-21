from solution import sum_counts


def test_sum_counts_example_one():
    assert sum_counts([1, 2, 1]) == 15


def test_sum_counts_example_two():
    assert sum_counts([2, 2]) == 3


def test_sum_counts_single():
    assert sum_counts([5]) == 1


def test_sum_counts_all_distinct():
    assert sum_counts([1, 2, 3]) == 20


def test_sum_counts_all_same():
    assert sum_counts([7, 7, 7]) == 6
