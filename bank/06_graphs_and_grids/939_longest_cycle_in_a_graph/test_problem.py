from solution import longest_cycle


def test_longest_cycle_three_node_cycle():
    assert longest_cycle([3, 3, 4, 2, 3]) == 3


def test_longest_cycle_no_cycle():
    assert longest_cycle([2, -1, 3, 1]) == -1


def test_longest_cycle_two_node_cycle():
    assert longest_cycle([1, 0]) == 2


def test_longest_cycle_picks_longer_of_two():
    assert longest_cycle([1, 0, 3, 4, 2]) == 3


def test_longest_cycle_tail_into_earlier_cycle():
    assert longest_cycle([1, 2, 1, 0, 3]) == 2


def test_longest_cycle_whole_graph():
    assert longest_cycle([1, 2, 3, 4, 0]) == 5
