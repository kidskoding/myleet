from solution import ways_to_make_fair


def test_ways_to_make_fair_one_way():
    assert ways_to_make_fair([2, 1, 6, 4]) == 1


def test_ways_to_make_fair_all_ways():
    assert ways_to_make_fair([1, 1, 1]) == 3


def test_ways_to_make_fair_no_way():
    assert ways_to_make_fair([1, 2, 3]) == 0


def test_ways_to_make_fair_single_element():
    assert ways_to_make_fair([5]) == 1


def test_ways_to_make_fair_two_elements():
    assert ways_to_make_fair([1, 2]) == 0


def test_ways_to_make_fair_alternating_values():
    assert ways_to_make_fair([1, 2, 1, 2, 1, 2]) == 1
