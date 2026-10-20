from solution import successful_pairs


def test_successful_pairs_normal():
    assert successful_pairs([5, 1, 3], [1, 2, 3, 4, 5], 7) == [4, 0, 3]


def test_successful_pairs_higher_threshold():
    assert successful_pairs([3, 1, 2], [8, 5, 8], 16) == [2, 0, 2]
