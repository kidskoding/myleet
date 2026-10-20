from solution import minimum_cost


def test_minimum_cost_several_positions():
    assert minimum_cost("abcd", "acbe", ["a", "b", "c", "c", "e", "d"], ["b", "c", "b", "e", "b", "e"], [2, 5, 5, 1, 2, 20]) == 28


def test_minimum_cost_through_intermediate():
    assert minimum_cost("aaaa", "bbbb", ["a", "c"], ["c", "b"], [1, 2]) == 12


def test_minimum_cost_impossible():
    assert minimum_cost("abcd", "abce", ["a"], ["e"], [10000]) == -1


def test_minimum_cost_already_equal():
    assert minimum_cost("ab", "ab", ["a"], ["b"], [1]) == 0


def test_minimum_cost_indirect_beats_direct():
    assert minimum_cost("a", "c", ["a", "a", "b"], ["c", "b", "c"], [10, 1, 1]) == 2
