import random

from list_node import ListNode
from solution import Solution


def build(values: list[int]) -> ListNode | None:
    head = None
    for value in reversed(values):
        head = ListNode(value, head)
    return head


def test_get_random_returns_list_values():
    random.seed(1)
    picker = Solution(build([1, 2, 3]))
    for _ in range(200):
        assert picker.get_random() in {1, 2, 3}


def test_get_random_reaches_every_node():
    random.seed(2)
    picker = Solution(build([1, 2, 3]))
    assert {picker.get_random() for _ in range(300)} == {1, 2, 3}


def test_get_random_single_node():
    random.seed(3)
    picker = Solution(build([-7]))
    assert {picker.get_random() for _ in range(20)} == {-7}


def test_get_random_is_roughly_uniform():
    random.seed(4)
    picker = Solution(build([10, 20, 30, 40]))
    trials = 4000
    counts = {10: 0, 20: 0, 30: 0, 40: 0}
    for _ in range(trials):
        counts[picker.get_random()] += 1
    for count in counts.values():
        assert 0.18 * trials < count < 0.32 * trials


def test_get_random_duplicate_values_weighted_by_count():
    random.seed(5)
    picker = Solution(build([5, 5, 5, 9]))
    trials = 4000
    fives = sum(picker.get_random() == 5 for _ in range(trials))
    assert 0.68 * trials < fives < 0.82 * trials
