import random

from solution import Solution


def test_pick_avoids_blacklist():
    random.seed(1)
    n, blacklist = 7, [2, 3, 5]
    picker = Solution(n, blacklist)
    banned = set(blacklist)
    for _ in range(300):
        value = picker.pick()
        assert 0 <= value < n
        assert value not in banned


def test_pick_covers_all_allowed():
    random.seed(2)
    n, blacklist = 5, [1, 3]
    picker = Solution(n, blacklist)
    allowed = {0, 2, 4}
    assert {picker.pick() for _ in range(500)} == allowed


def test_pick_empty_blacklist():
    random.seed(3)
    picker = Solution(4, [])
    assert {picker.pick() for _ in range(200)} == {0, 1, 2, 3}


def test_pick_blacklist_at_end():
    random.seed(4)
    picker = Solution(4, [2, 3])
    assert {picker.pick() for _ in range(200)} == {0, 1}


def test_pick_roughly_uniform():
    random.seed(5)
    picker = Solution(6, [1, 4])
    trials = 4000
    counts = {0: 0, 2: 0, 3: 0, 5: 0}
    for _ in range(trials):
        counts[picker.pick()] += 1
    for count in counts.values():
        assert 0.18 * trials < count < 0.32 * trials
