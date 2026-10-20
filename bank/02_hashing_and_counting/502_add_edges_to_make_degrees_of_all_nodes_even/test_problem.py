from solution import is_possible


def test_is_possible_two_odd_nodes_joined_directly():
    assert is_possible(5, [[1, 2], [2, 3], [3, 4], [4, 2], [1, 4], [2, 5]]) is True


def test_is_possible_four_odd_nodes_paired():
    assert is_possible(4, [[1, 2], [3, 4]]) is True


def test_is_possible_star_is_impossible():
    assert is_possible(4, [[1, 2], [1, 3], [1, 4]]) is False


def test_is_possible_already_even():
    assert is_possible(3, [[1, 2], [2, 3], [1, 3]]) is True


def test_is_possible_adjacent_odd_pair_with_free_third_node():
    assert is_possible(5, [[1, 2], [3, 4], [1, 3], [2, 3]]) is True


def test_is_possible_adjacent_odd_pair_with_no_free_node():
    assert is_possible(4, [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4]]) is False
