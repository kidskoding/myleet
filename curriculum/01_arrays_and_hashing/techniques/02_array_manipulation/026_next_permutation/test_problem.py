from solution import next_permutation


def test_next_permutation_middle():
    nums = [1, 2, 3]
    next_permutation(nums)
    assert nums == [1, 3, 2]


def test_next_permutation_last_wraps_to_first():
    nums = [3, 2, 1]
    next_permutation(nums)
    assert nums == [1, 2, 3]


def test_next_permutation_with_duplicates():
    nums = [1, 1, 5]
    next_permutation(nums)
    assert nums == [1, 5, 1]


def test_next_permutation_single():
    nums = [1]
    next_permutation(nums)
    assert nums == [1]
