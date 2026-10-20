from solution import minimum_cost


def test_minimum_cost_single_characters():
    assert minimum_cost("abcd", "acbe", ["a", "b", "c", "c", "e", "d"], ["b", "c", "b", "e", "b", "e"], [2, 5, 5, 1, 2, 20]) == 28


def test_minimum_cost_substring_chain():
    assert minimum_cost("abcdefgh", "acdeeghh", ["bcd", "fgh", "thh"], ["cde", "thh", "ghh"], [1, 3, 5]) == 9


def test_minimum_cost_overlapping_rules_impossible():
    assert minimum_cost("abcdefgh", "addddddd", ["bcd", "defgh"], ["ddd", "ddddd"], [100, 1578]) == -1


def test_minimum_cost_already_equal():
    assert minimum_cost("abc", "abc", ["a"], ["b"], [5]) == 0


def test_minimum_cost_chain_beats_direct():
    assert minimum_cost("abc", "xyz", ["abc", "pqr", "abc"], ["pqr", "xyz", "xyz"], [1, 2, 10]) == 3


def test_minimum_cost_swap_two_characters():
    assert minimum_cost("ab", "ba", ["a", "b"], ["b", "a"], [1, 2]) == 3
