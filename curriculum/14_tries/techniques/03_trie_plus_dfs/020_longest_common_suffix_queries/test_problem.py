from solution import string_indices


def test_string_indices_shortest_wins_on_tie():
    assert string_indices(["abcd", "bcd", "xbcd"], ["cd", "bcd", "xyz"]) == [1, 1, 1]


def test_string_indices_longest_common_suffix():
    container = ["abcdefgh", "poiuygh", "ghghgh"]
    assert string_indices(container, ["gh", "acbfgh", "acbfegh"]) == [2, 0, 2]
