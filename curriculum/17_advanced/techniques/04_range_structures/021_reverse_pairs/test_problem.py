from solution import reverse_pairs


def test_reverse_pairs_normal():
    assert reverse_pairs([1, 3, 2, 3, 1]) == 2


def test_reverse_pairs_more():
    assert reverse_pairs([2, 4, 3, 5, 1]) == 3
