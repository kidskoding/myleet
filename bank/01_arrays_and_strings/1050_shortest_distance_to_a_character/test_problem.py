from solution import shortest_to_char


def test_shortest_to_char_example():
    assert shortest_to_char("loveleetcode", "e") == [3, 2, 1, 0, 1, 0, 0, 1, 2, 2, 1, 0]


def test_shortest_to_char_target_at_end():
    assert shortest_to_char("aaab", "b") == [3, 2, 1, 0]


def test_shortest_to_char_single():
    assert shortest_to_char("e", "e") == [0]


def test_shortest_to_char_both_ends():
    assert shortest_to_char("baab", "b") == [0, 1, 1, 0]


def test_shortest_to_char_target_at_start():
    assert shortest_to_char("abbb", "a") == [0, 1, 2, 3]
