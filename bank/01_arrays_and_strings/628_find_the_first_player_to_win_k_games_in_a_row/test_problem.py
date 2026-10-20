from solution import find_winning_player


def test_find_winning_player_example_one():
    assert find_winning_player([4, 2, 6, 3, 9], 2) == 2


def test_find_winning_player_example_two():
    assert find_winning_player([2, 5, 4], 3) == 1


def test_find_winning_player_k_larger_than_n():
    assert find_winning_player([3, 1, 2], 10) == 0


def test_find_winning_player_k_one():
    assert find_winning_player([1, 5, 3], 1) == 1
    assert find_winning_player([1, 2, 3, 4, 5], 1) == 1


def test_find_winning_player_first_player_strongest():
    assert find_winning_player([5, 1, 2, 3, 4], 4) == 0
