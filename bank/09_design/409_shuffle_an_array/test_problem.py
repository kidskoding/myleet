import random

from solution import Solution


def test_solution_shuffle_is_permutation():
    s = Solution([1, 2, 3, 4, 5])
    assert sorted(s.shuffle()) == [1, 2, 3, 4, 5]


def test_solution_reset_restores_original():
    s = Solution([1, 2, 3])
    s.shuffle()
    s.shuffle()
    assert s.reset() == [1, 2, 3]


def test_solution_single_element():
    s = Solution([7])
    assert s.shuffle() == [7]
    assert s.reset() == [7]


def test_solution_all_permutations_appear():
    random.seed(12345)
    s = Solution([1, 2, 3])
    seen = {tuple(s.shuffle()) for _ in range(600)}
    assert len(seen) == 6


def test_solution_roughly_uniform():
    random.seed(2024)
    s = Solution([1, 2, 3])
    counts: dict[tuple[int, ...], int] = {}
    for _ in range(6000):
        p = tuple(s.shuffle())
        counts[p] = counts.get(p, 0) + 1
    assert len(counts) == 6
    assert all(900 <= c <= 1100 for c in counts.values())


def test_solution_duplicates_kept():
    s = Solution([2, 2, 1])
    assert sorted(s.shuffle()) == [1, 2, 2]
