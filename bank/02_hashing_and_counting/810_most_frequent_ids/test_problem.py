from solution import most_frequent_ids


def test_most_frequent_ids_removal_changes_leader():
    assert most_frequent_ids([2, 3, 2, 1], [3, 2, -3, 1]) == [3, 3, 2, 2]


def test_most_frequent_ids_empty_collection():
    assert most_frequent_ids([5, 5, 3], [2, -2, 1]) == [2, 0, 1]


def test_most_frequent_ids_single_step():
    assert most_frequent_ids([7], [4]) == [4]


def test_most_frequent_ids_partial_removal():
    assert most_frequent_ids([1, 2, 1, 2], [5, 3, -4, 1]) == [5, 5, 3, 4]


def test_most_frequent_ids_large_counts():
    assert most_frequent_ids([1, 1], [100_000, 100_000]) == [100_000, 200_000]
