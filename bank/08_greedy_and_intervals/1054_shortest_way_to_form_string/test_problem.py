from solution import shortest_way


def test_shortest_way_two_copies():
    assert shortest_way("abc", "abcbc") == 2


def test_shortest_way_impossible():
    assert shortest_way("abc", "acdbc") == -1


def test_shortest_way_three_copies():
    assert shortest_way("xyz", "xzyxz") == 3


def test_shortest_way_same_string():
    assert shortest_way("abc", "abc") == 1


def test_shortest_way_repeated_char():
    assert shortest_way("a", "aaaa") == 4
