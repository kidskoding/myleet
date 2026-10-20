from solution import top_k_frequent


def test_top_k_frequent_normal():
    assert sorted(top_k_frequent([1, 1, 1, 2, 2, 3], 2)) == [1, 2]


def test_top_k_frequent_all_unique():
    assert sorted(top_k_frequent([1, 2, 3], 3)) == [1, 2, 3]


def test_top_k_frequent_single():
    assert top_k_frequent([1], 1) == [1]
