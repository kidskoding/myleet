import random

from solution import Solution


def test_pick_returns_matching_index():
    random.seed(1)
    nums = [1, 2, 3, 3, 3]
    picker = Solution(nums)
    for _ in range(200):
        assert nums[picker.pick(3)] == 3


def test_pick_single_occurrence():
    random.seed(2)
    picker = Solution([1, 2, 3, 3, 3])
    assert {picker.pick(1) for _ in range(50)} == {0}


def test_pick_reaches_every_occurrence():
    random.seed(3)
    picker = Solution([1, 2, 3, 3, 3])
    assert {picker.pick(3) for _ in range(500)} == {2, 3, 4}


def test_pick_is_roughly_uniform():
    random.seed(4)
    picker = Solution([5, 7, 5, 7, 5])
    trials = 3000
    counts = {0: 0, 2: 0, 4: 0}
    for _ in range(trials):
        counts[picker.pick(5)] += 1
    for count in counts.values():
        assert 0.25 * trials < count < 0.42 * trials


def test_pick_all_same_value():
    random.seed(5)
    picker = Solution([9, 9, 9, 9])
    assert {picker.pick(9) for _ in range(500)} == {0, 1, 2, 3}
