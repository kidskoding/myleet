from solution import count_pairs


def test_count_pairs_distinct_values():
    assert count_pairs([1, 3, 5, 7, 9]) == 4


def test_count_pairs_duplicates_counted_by_index():
    assert count_pairs([1, 1, 1, 3, 3, 3, 7]) == 15


def test_count_pairs_zero_sum_is_not_power():
    assert count_pairs([0, 0]) == 0


def test_count_pairs_zero_plus_one():
    assert count_pairs([0, 1, 1]) == 3


def test_count_pairs_largest_values():
    assert count_pairs([2**20, 2**20]) == 1


def test_count_pairs_single_item():
    assert count_pairs([4]) == 0
