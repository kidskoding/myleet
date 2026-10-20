from solution import earliest_full_bloom


def test_earliest_full_bloom_example_one():
    assert earliest_full_bloom([1, 4, 3], [2, 3, 1]) == 9


def test_earliest_full_bloom_example_two():
    assert earliest_full_bloom([1, 2, 3, 2], [2, 1, 2, 1]) == 9


def test_earliest_full_bloom_single_seed():
    assert earliest_full_bloom([1], [1]) == 2


def test_earliest_full_bloom_long_grower_first():
    assert earliest_full_bloom([3, 1], [1, 5]) == 6


def test_earliest_full_bloom_equal_seeds():
    assert earliest_full_bloom([2, 2, 2], [1, 1, 1]) == 7
