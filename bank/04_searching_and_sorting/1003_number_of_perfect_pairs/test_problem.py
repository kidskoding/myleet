from solution import perfect_pairs


def test_perfect_pairs_example_one():
    assert perfect_pairs([0, 1, 2, 3]) == 2


def test_perfect_pairs_mixed_signs():
    assert perfect_pairs([-3, 2, -1, 4]) == 4


def test_perfect_pairs_none():
    assert perfect_pairs([1, 10, 100, 1000]) == 0


def test_perfect_pairs_two_zeros():
    assert perfect_pairs([0, 0]) == 1


def test_perfect_pairs_zero_with_nonzero():
    assert perfect_pairs([0, 1]) == 0


def test_perfect_pairs_opposites():
    assert perfect_pairs([5, -5, 10]) == 3
