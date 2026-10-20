from solution import array_rank_transform


def test_array_rank_transform_distinct():
    assert array_rank_transform([40, 10, 20, 30]) == [4, 1, 2, 3]


def test_array_rank_transform_all_equal():
    assert array_rank_transform([100, 100, 100]) == [1, 1, 1]


def test_array_rank_transform_with_duplicates():
    arr = [37, 12, 28, 9, 100, 56, 80, 5, 12]
    assert array_rank_transform(arr) == [5, 3, 4, 2, 8, 6, 7, 1, 3]


def test_array_rank_transform_empty():
    assert array_rank_transform([]) == []


def test_array_rank_transform_negatives():
    assert array_rank_transform([-5, 0, -5]) == [1, 2, 1]
