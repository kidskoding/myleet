from solution import rotate


def test_rotate_normal():
    nums = [1, 2, 3, 4, 5, 6, 7]
    rotate(nums, 3)
    assert nums == [5, 6, 7, 1, 2, 3, 4]


def test_rotate_with_negatives():
    nums = [-1, -100, 3, 99]
    rotate(nums, 2)
    assert nums == [3, 99, -1, -100]


def test_rotate_k_larger_than_length():
    nums = [1, 2]
    rotate(nums, 3)
    assert nums == [2, 1]


def test_rotate_k_zero_leaves_it_unchanged():
    nums = [1, 2, 3, 4]
    rotate(nums, 0)
    assert nums == [1, 2, 3, 4]


def test_rotate_k_equals_length_is_a_full_cycle():
    """k % n == 0, so the array must come back unchanged.

    The slicing shortcut breaks here: nums[-0:] is the whole list, not empty.
    """
    nums = [1, 2, 3, 4]
    rotate(nums, 4)
    assert nums == [1, 2, 3, 4]


def test_rotate_k_is_a_multiple_of_length():
    nums = [1, 2, 3]
    rotate(nums, 6)
    assert nums == [1, 2, 3]
